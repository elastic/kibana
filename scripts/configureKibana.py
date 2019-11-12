# File: configureKibana.py
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

resources = '/usr/local/kibana-7.2.0-linux-x64/resources'

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
        logger.warning('[configureKibana.py] Caught HTTP exception: {0}'.format(err))
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

        logger.info('PUT RETURNS:\n' + UTIL.pretty_format(response.json()))
        return True, response.text

    except Exception as err:
        logger.warning('[configureKibana.py] Caught HTTP exception: {0}'.format(err))
        return False, 'Not found'

def get_es_id(filename):
    return splitext(filename)[0]

def load_assets(path_to_files):
    # Create arrays of the filenames in the resources directory
    files = [filename for filename in listdir(resources) if isfile(join(resources, filename))]
    for file in files:
        logger.info('--------- ' + file + ' ---------')
        full_file_path = path_to_files + '/' + file
        es_id = get_es_id(file)
        created, created_ret = put_document_from_file(es_id, full_file_path)
        if not created:
            logger.warning('Failed to load kibana object: ' + file)

def setup_config():
    # setup the default query type to be Lucene (not KQL)
    try:
        url = 'http://localhost:9200/.kibana/_update/config:7.2.0'
        session = requests.Session()
        retries = Retry(total=5, backoff_factor=0.3, status_forcelist=[500, 503])
        session.mount('https://', HTTPAdapter(max_retries=retries))
        session.mount('http://', HTTPAdapter(max_retries=retries))
        headers = {
            'Content-type': 'application/json',
            'kbn-version': '7.2.0'
        }
        data = json.dumps({
            'doc': {
                'config': {
                    'search:queryLanguage': 'lucene'
                }
            },
            'doc_as_upsert': True
        })
        response = session.post(url, headers=headers, data=data)

        if not response.ok:
            response.raise_for_status()

        logger.info('POST RETURNS:\n' + UTIL.pretty_format(response.json()))

    except Exception as err:
        logger.warning('[configureKibana.py] Caught HTTP exception: {0}'.format(err))


# ----------------- MAIN -----------------
def main():

    es_ok = check_elasticsearch_health()
    if es_ok:
        setup_config()

        # Load all the artifacts appropriately
        load_assets(resources)
    else:
      logger.error('elasticsearch is not ready\n')
      sys.exit(1)


if __name__ == '__main__':
    main()
