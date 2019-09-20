#!/usr/bin/python
import os
import requests
import sys
import argparse
import json
from util import Utility
from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry

EXPORT_LOG = '/tmp/ExportAssets.log'
UTIL = Utility(log_file=EXPORT_LOG)
logging, rotating_handler = UTIL.get_logging()
logger = logging.getLogger()



def check_elasticsearch_health():
    try:
        url = 'http://localhost:9200/_cluster/health?wait_for_status=yellow&timeout=60s'
        session = requests.Session()
        response = session.get(url)
        if not response.ok:
            response.raise_for_status()

        logger.info('elasticsearch status:\n' + UTIL.pretty_format(response.json()))
        return True

    except Exception as err:
        logger.warning('[exportAssets.py] Caught HTTP exception: {0}'.format(err))
        return False

def get_search_title_json(es_type, es_title):
    es_field = es_type + '.title'
      
    query = {
        'query': {
            'match_phrase': {
                es_field : es_title
            }
        }
    }
    return query
   
def get_search_id_json(es_type, es_id):
    query = {
        'query': {
            'match_phrase': {
                '_id' : es_type + ':' + es_id
            }
        }
    }
    return query
   
def get_asset(es_query):
    try:
        url = 'http://localhost:9200/.kibana/_search'
      
        session = requests.Session()
        # Retry on: Request Timeout (408), Internal Server Error (500), Bad Gateway (502), Service Unavailable (503),
        # and Gateway timeout (504)
        retries = Retry(total=5, backoff_factor=0.3, status_forcelist=[408, 500, 502, 503, 504])
        session.mount('https://', HTTPAdapter(max_retries=retries))
        session.mount('http://', HTTPAdapter(max_retries=retries))
        esQuery = json.dumps(es_query)
        headers = { 'Content-type': 'application/json' }
        response = session.get(url, headers=headers, data=esQuery)

        logger.info('GET RETURNS:\n' + UTIL.pretty_format(response.json()))

        if not response.ok:
            response.raise_for_status()

        return True, response.text

    except Exception as err:
        logger.info('[exportAssets.py] Caught HTTP exception: {0}'.format(err))
        return False, 'Not found'

def print_error_and_usage(argParser, error):
    print 'Error:  ' + error + '\n'
    print argParser.print_help()
    sys.exit(1)

def santize_input_args(arg_parser, args):
    if len(sys.argv) == 1:
        print_error_and_usage(arg_parser, 'No arguments supplied.')
    if (args.dash_name is None
        and args.viz_name is None
        and args.search_name is None):
        print_error_and_usage(arg_parser, 'Must have one of the following flags: -d -v -s')

def get_filename(asset_title):
    return asset_title + '.json'

def get_full_path(output_dir, asset_id):
    if output_dir[-1] == '/':
        return output_dir + get_filename(asset_id)
    else:
        return output_dir + '/' + get_filename(asset_id)

def strip_metadata(json_string):
    ob = json.loads(json_string)['hits']['hits'][0]
    return UTIL.safe_list_read(list_ob=ob, key='_source')

def get_dashboard_panels(panels_str):
    panels_with_type = {}
    db_panels_json = panels_str
    for index, panel in enumerate(db_panels_json):
        panel_id = UTIL.safe_list_read(list_ob=db_panels_json[index], key='id')
        panel_type = UTIL.safe_list_read(list_ob=db_panels_json[index], key='type')
        panels_with_type[panel_id] = panel_type
    return panels_with_type

def export_all_files(asset_dict):
    for asset_name, asset_content in asset_dict.iteritems():
        UTIL.print_to_file(asset_content, asset_name)

def get_all_dashboard_content_from_ES(output_dir, dashboard_raw, asset_dict):
    db_json = UTIL.make_json(dashboard_raw)
    db_panels_raw = UTIL.safe_list_read(list_ob=db_json, key='references')
    panels_with_type = get_dashboard_panels(db_panels_raw)
    for panel_id, panel_type in panels_with_type.iteritems():
        es_query = get_search_id_json(panel_type, panel_id)
        success, asset_raw = get_asset(es_query)
        if success:
            asset_id = panel_type + ':' + panel_id
            add_asset_to_output_dict(output_dir, asset_raw=asset_raw, asset_id=asset_id, asset_dict=asset_dict)
        else:
            print 'ERROR: Failed to get asset ' + panel_id + ' needed by dashboard.'

def add_asset_to_output_dict(output_dir, asset_raw, asset_id, asset_dict):
    asset_raw_no_meta = strip_metadata(json_string=asset_raw)
    full_file_path = get_full_path(output_dir=output_dir, asset_id=asset_id)
    asset_dict[full_file_path] = asset_raw_no_meta


# ----------------- MAIN -----------------
def main(argv):

    argParser = argparse.ArgumentParser(description='Export dashboards, visualizations, or searches from Elasticsearch')
    argParser.add_argument('-d', '--dashboard', dest='dash_name', metavar='DASHBOARD_NAME', \
        help='Export dashboard and all of its assets')
    argParser.add_argument('-v', '--visualization', dest='viz_name', metavar='VIZUALIZATION_NAME', \
        help='Export a single visualization')
    argParser.add_argument('-s', '--search', dest='search_name', metavar='SEARCH_NAME', \
        help='Export a single search')
    argParser.add_argument('-o', '--outputdir', dest='directory', metavar='DIR_NAME', \
        help='Specify an output directory for the exported file')
   
    args = argParser.parse_args()

    santize_input_args(arg_parser=argParser, args=args)
   
    output_dir = os.path.dirname(os.path.realpath(__file__)) 
    file_paths_and_contents = {}

    asset_type = ''
    asset_title = None

    if args.dash_name:
        asset_type = 'dashboard'
        asset_title = args.dash_name
    elif args.viz_name:
        asset_type = 'visualization'
        asset_title = args.viz_name
    elif args.search_name:
        asset_type = 'search'
        asset_title = args.search_name

    if args.directory:
        output_dir = args.directory

    es_ok = check_elasticsearch_health()
    if es_ok:
        es_query = get_search_title_json(asset_type, asset_title)
        success, asset_raw = get_asset(es_query)

        if success:
            ret_json = json.loads(asset_raw)
            if ret_json['hits']['total']['value'] == 1:
                asset = ret_json['hits']['hits'][0]
                asset_id = asset['_id']
                add_asset_to_output_dict(output_dir, asset_raw=asset_raw, asset_id=asset_id, \
                    asset_dict=file_paths_and_contents)
                if asset_type == 'dashboard':
                    get_all_dashboard_content_from_ES(output_dir=output_dir, \
                        dashboard_raw=UTIL.safe_list_read(list_ob=file_paths_and_contents, \
                            key=get_full_path(output_dir=output_dir, asset_id=asset_id)), \
                        asset_dict=file_paths_and_contents)
                export_all_files(asset_dict=file_paths_and_contents)
            else:
                print 'Failed to find ' + asset_type + ' named "' + asset_title + '" in elasticsearch.'
                sys.exit(1)
        else:
            print 'ERROR: Attempt to get ' + asset_type + ' named "' + asset_title + '" failed.'
            print 'See ' + EXPORT_LOG + ' for more details.'
            sys.exit(1)
    else:
      print 'elasticsearch is not ready\n'
      sys.exit(1)


if __name__ == '__main__':
    main(sys.argv[1:])
