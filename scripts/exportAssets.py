#!/usr/bin/python
import os
import requests
import sys
import argparse
import json
from util import Utility
from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry

EXPORT_LOG = "/tmp/ExportAssets.log"
UTIL = Utility(log_file=EXPORT_LOG)
logging, rotating_handler = UTIL.get_logging()
logger = logging.getLogger()

OUTPUT_DIR = os.path.dirname(os.path.realpath(__file__)) 

TYPE = None
TITLE = None

DASHBOARD = "dashboard"
VISUALIZATION = "visualization"
SEARCH = "search"

FILE_PATHS_AND_CONTENTS = {}

def check_elasticsearch_health():
    try:
        url = 'http://localhost:9200/_cluster/health?wait_for_status=yellow&timeout=60s'
        session = requests.Session()
        response = session.get(url)
        if not response.ok:
            response.raise_for_status()

        logger.info("elasticsearch status: " + "\n" + UTIL.pretty_format(response.json()))
        return True

    except Exception as err:
        logger.warning("[loadAssets.py] Caught HTTP exception: {0}".format(err))
        return False

def get_search_title_json(es_type, es_title):
    esField = es_type + '.title'
      
    query = {
        "query": {
            "match_phrase": {
                esField : es_title
            }
        }
    }
    return query
   
def get_search_id_json(es_type, es_id):
    query = {
        "query": {
            "match_phrase": {
                "_id" : es_type + ":" + es_id
            }
        }
    }
    return query
   
def get_asset(es_query):
    try:
        url = 'http://localhost:9200/.kibana/_search'
      
        session = requests.Session()
        # Retry on Internal Server Error (500) and Service Unavailable (503)
        retries = Retry(total=5, backoff_factor=0.3, status_forcelist=[ 500, 503])
        session.mount('https://', HTTPAdapter(max_retries=retries))
        session.mount('http://', HTTPAdapter(max_retries=retries))
        esQuery = json.dumps(es_query)
        headers = { 'Content-type': 'application/json' }
        response = session.get(url, headers=headers, data=esQuery)

        if not response.ok:
            response.raise_for_status()

        logger.info("GET RETURNS: " + "\n" + UTIL.pretty_format(response.json()))
        return True, response.text

    except Exception as err:
        logger.info("[getEs.py] Caught HTTP exception: {0}".format(err))
        return False, "Not found"

def print_error_and_usage(argParser, error):
    print "Error:  " + error + "\n"
    print argParser.print_help()
    sys.exit(2)

def santize_input_args(arg_parser, args):
    if len(sys.argv) == 1:
        print_error_and_usage(arg_parser, "No arguments supplied.")
    if (args.dash_name is None
        and args.viz_name is None
        and args.search_name is None):
        print_error_and_usage(arg_parser, "Must have one of the following flags: -d -v -s")

def get_filename(asset_title):
    return asset_title + ".json"

def get_full_path(asset_id):
    global OUTPUT_DIR
    if OUTPUT_DIR[-1] == '/':
        return OUTPUT_DIR + get_filename(asset_id)
    else:
        return OUTPUT_DIR + "/" + get_filename(asset_id)

def strip_metadata(json_string):
    ob = json.loads(json_string)["hits"]["hits"][0]
    return UTIL.safe_list_read(list_ob=ob, key='_source')

def get_dashboard_panels(panels_str):
    panels_with_type = {}
    db_panels_json = panels_str
    for index, panel in enumerate(db_panels_json):
        panel_id = UTIL.safe_list_read(list_ob=db_panels_json[index], key='id')
        panel_type = UTIL.safe_list_read(list_ob=db_panels_json[index], key='type')
        panels_with_type[panel_id] = panel_type
    return panels_with_type

def export_all_files(asset_dict=FILE_PATHS_AND_CONTENTS):
    global OUTPUT_DIR
    for asset_name, asset_content in asset_dict.iteritems():
        UTIL.print_to_file(asset_content, asset_name)

def get_all_dashboard_content_from_ES(dashboard_raw):
    global FILE_PATHS_AND_CONTENTS
    db_json = UTIL.make_json(dashboard_raw)
    db_panels_raw = UTIL.safe_list_read(list_ob=db_json, key='references')
    panels_with_type = get_dashboard_panels(db_panels_raw)
    for panel_id, panel_type in panels_with_type.iteritems():
        es_query = get_search_id_json(panel_type, panel_id)
        success, asset_raw = get_asset(es_query)
        asset_id = panel_type + ":" + panel_id
        if success:
            add_asset_to_output_dict(asset_raw=asset_raw, asset_id=asset_id)
        else:
            print "ERROR: Failed to get asset " + panel_id + " needed by dashboard."

def add_asset_to_output_dict(asset_raw, asset_id):
    global FILE_PATHS_AND_CONTENTS
    asset_raw_no_meta = strip_metadata(json_string=asset_raw)
    full_file_path = get_full_path(asset_id=asset_id)
    FILE_PATHS_AND_CONTENTS[full_file_path] = asset_raw_no_meta


# ----------------- MAIN -----------------
def main(argv):

    argParser = argparse.ArgumentParser(description="Export dashboards, visualizations, or searches from Elasticsearch")
    argParser.add_argument("-d", "--dashboard", dest="dash_name", metavar="DASHBOARD_NAME", help="Export dashboard and all of its assets")
    argParser.add_argument("-v", "--visualization", dest="viz_name", metavar="VIZUALIZATION_NAME", help="Export a single visualization")
    argParser.add_argument("-s", "--search", dest="search_name", metavar="SEARCH_NAME", help="Export a single search")
    argParser.add_argument("-o", "--outputdir", dest="directory", metavar="DIR_NAME", help="Specify an output directory for the exported file")
   
    args = argParser.parse_args()

    santize_input_args(arg_parser=argParser, args=args)
   
    global OUTPUT_DIR
    global FILE_PATHS_AND_CONTENTS
    global TYPE
    global TITLE

    if args.dash_name:
        TYPE = DASHBOARD
        TITLE = args.dash_name
    elif args.viz_name:
        TYPE = VISUALIZATION
        TITLE = args.viz_name
    elif args.search_name:
        TYPE = SEARCH
        TITLE = args.search_name

    if args.directory:
        OUTPUT_DIR = args.directory

    es_ok = check_elasticsearch_health()
    if es_ok:
        es_query = get_search_title_json(TYPE, TITLE)
        success, asset_raw = get_asset(es_query)

        if success:
            ob = json.loads(asset_raw)["hits"]["hits"][0]
            asset_id = ob["_id"]
            add_asset_to_output_dict(asset_raw=asset_raw, asset_id=asset_id)
            if TYPE == DASHBOARD:
                get_all_dashboard_content_from_ES(dashboard_raw=UTIL.safe_list_read(list_ob=FILE_PATHS_AND_CONTENTS, key=get_full_path(asset_id=asset_id)))
            export_all_files()
        else:
            print "ERROR:   Did not find any " + TYPE + " named " + TITLE + " in Elasticsearch."
            sys.exit(2)
    else:
      print "elasticsearch is not ready\n"
      sys.exit(1)


if __name__ == '__main__':
    main(sys.argv[1:])
