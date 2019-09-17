# File: loadAssets.py
#
# Author: Craig Cogdill

import sys
import json
import requests
import time
from os import listdir
from os.path import isfile, join, splitext
from util import Utility
from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry
UTIL = Utility()
logging, rotating_handler = UTIL.get_logging()
logger = logging.getLogger()

resources = "/usr/local/kibana-7.2.0-linux-x64/resources"

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

def set_default_index_pattern():
    try:
        url = 'http://localhost:9200/.kibana/_update/config:7.2.0'

        postJson = {
            "doc": {
                "config": {
                    "defaultIndex" : "361f5c00-b47c-11e9-86a0-cd3d7bf2f81b"
                }
            }
        }

        session = requests.Session()
        # Retry on Internal Server Error (500) and Service Unavailable (503)
        retries = Retry(total=5, backoff_factor=0.3, status_forcelist=[ 500, 503])
        session.mount('https://', HTTPAdapter(max_retries=retries))
        session.mount('http://', HTTPAdapter(max_retries=retries))
        esJson = json.dumps(postJson)
        headers = { 'Content-type': 'application/json' }
        response = session.post(url, headers=headers, data=esJson)

        if not response.ok:
            response.raise_for_status()

        logger.info("Successfully set index pattern:\n" + UTIL.pretty_format(response.json()))
        return True

    except Exception as err:
        logger.warning("[loadAssets.py] Failed to set default index pattern: {0}".format(err) \
            + "\n\turl: {0}".format(url) + "\n\tpostJson: {0}".format(postJson))
        return False

def put_document_from_file(es_id, path_to_updated_json):
    content = UTIL.read_json_from_file(path_to_updated_json)
    try:
        url = 'http://localhost:9200/.kibana/_doc/' + es_id
      
        session = requests.Session()
        # Retry on Internal Server Error (500) and Service Unavailable (503)
        retries = Retry(total=5, backoff_factor=0.3, status_forcelist=[ 500, 503])
        session.mount('https://', HTTPAdapter(max_retries=retries))
        session.mount('http://', HTTPAdapter(max_retries=retries))
        esJson = json.dumps(content)
        headers = { 'Content-type': 'application/json' }
        response = session.put(url, headers=headers, data=esJson)

        if not response.ok:
            response.raise_for_status()

        logger.info("PUT RETURNS: " + "\n" + UTIL.pretty_format(response.json()))
        return True, response.text

    except Exception as err:
        logger.warning("[loadAssets.py] Caught HTTP exception: {0}".format(err))
        return False, "Not found"

def get_es_id(filename):
    return splitext(filename)[0]

def load_assets(path_to_files, files):
    for file in files:
        logger.info("--------- " + file + " ---------")
        full_file_path = path_to_files + "/" + file
        es_id = get_es_id(file)
        created, created_ret = put_document_from_file(es_id, full_file_path)
        if not created:
            logger.warning("Failed to load kibana object: " + file)


# ----------------- MAIN -----------------
def main():

    es_ok = check_elasticsearch_health()
    if es_ok:
        # Create arrays of the filenames in the resources directory
        objects = [filename for filename in listdir(resources) if isfile(join(resources, filename))]
        # Load all the artifacts appropriately
        load_assets(resources, objects)
        set_default_index_pattern()
    else:
      print "elasticsearch is not ready\n"
      sys.exit(1)


if __name__ == '__main__':
    main()
