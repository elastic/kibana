#!/usr/bin/python

import json
import time
import elasticsearch

class LogConfig:
    MAIN_LOG_FORMAT_STR='%(asctime)s.%(msecs)03d %(levelname)s:  %(message)s'
    MAIN_LOG_DATEFMT_STR='%Y/%m/%d %H:%M:%S'
    MAIN_LOG_PATH_DEFAULT='/var/log/probe/KibanaStartup.log'
    DEFAULT_LOGGING_LEVEL=10 # logging.DEBUG
    DEFAULT_LOG_ROTATE_BYTES=52428800 # 50MB
    DEFAULT_LOG_ROTATE_COUNT=3

    def __init__(self, log_file=MAIN_LOG_PATH_DEFAULT):
        self.MAIN_LOG_PATH_DEFAULT = log_file

    def configure_and_return_logging(self, datefmt_str=MAIN_LOG_DATEFMT_STR, format_str=MAIN_LOG_FORMAT_STR):
        import logging
        import logging.handlers
        logging.basicConfig(
            filename=self.MAIN_LOG_PATH_DEFAULT,
            level=self.DEFAULT_LOGGING_LEVEL,
            format=format_str,
            datefmt=datefmt_str)
        rotating_handler = logging.handlers.RotatingFileHandler(self.MAIN_LOG_PATH_DEFAULT,
                                                                maxBytes=self.DEFAULT_LOG_ROTATE_BYTES,
                                                                backupCount=self.DEFAULT_LOG_ROTATE_COUNT)
        return logging, rotating_handler

class ElasticsearchUtil:
    INDENT_LEVEL = 3
    ES_REQUEST_TIMEOUT = 20
    ES_QUERY_TIMEOUT = 20
    STARTUP_TIMEOUT = 300 # 5 minutes
    LOCALHOST="localhost:9200"
    KIBANA_INDEX = ".kibana"
    INDEX_PATTERN_TYPE = "index-pattern"
    CONFIG_TYPE = "config"
    KIBANA_VERSION = "4.1.10"
    es = elasticsearch.Elasticsearch(max_retries=1, timeout=ES_REQUEST_TIMEOUT)

    LOG_FILE="/var/log/probe/KibanaStartup.log"
    ES_TRACE_LOG_FILE="/tmp/ElasticsearchTrace.log"
    ES_LOGGER = None
    logging = None
    rotating_handler = None

    UTIL = None

    def set_es_trace_logger(self):
        es_tracer = self.logging.getLogger('elasticsearch.trace')
        es_tracer.setLevel(self.logging.DEBUG)
        es_tracer_handler=self.logging.handlers.RotatingFileHandler(self.ES_TRACE_LOG_FILE,
                                                                    maxBytes=self.ES_LOGGER.DEFAULT_LOG_ROTATE_BYTES,
                                                                    backupCount=3)
        es_tracer.addHandler(es_tracer_handler)

    def __init__(self, log_file=LOG_FILE):
        self.LOG_FILE = log_file
        self.ES_LOGGER = LogConfig(self.LOG_FILE)
        self.logging, self.rotating_handler = self.ES_LOGGER.configure_and_return_logging()
        self.set_es_trace_logger()
        self.UTIL = Utility(log_file)


    def format_for_update(self, content):
        return "{ \"doc\": " + str(json.dumps(content)) + " }"

    def update_document(self, es_index, es_type, es_id, content):
        update_ret_raw = json.dumps(self.es.update(index=es_index,
                                    doc_type=es_type,
                                    id=es_id,
                                    body=content))
        # There is no true/false return value for an ES update
        return True, update_ret_raw

    def search_index_and_type(self, es_index, es_type, query):
        search_response_raw = json.dumps(self.es.search(index=es_index,
                                                        doc_type=es_type,
                                                        q=query),
                                         indent=self.INDENT_LEVEL)
        search_response_json = json.loads(search_response_raw)
        hits_json = self.UTIL.safe_list_read(search_response_json, 'hits')
        search_number_of_hits = self.UTIL.safe_list_read(hits_json, 'total')
        return True, search_number_of_hits

    # Elasticsearch communication functions
    def create_document(self, es_index, es_type, es_id, es_body):
        es_create_ret = json.dumps(self.es.create(index=es_index,
                                   doc_type=es_type,
                                   id=es_id,
                                   body=es_body),
        indent=self.INDENT_LEVEL)
        es_create_ret_json = json.loads(es_create_ret)
        created = self.UTIL.safe_list_read(es_create_ret_json, 'created')
        return created, es_create_ret

    def document_exists(self, es_index, es_type, es_id):
        exists_ret = self.es.exists(index=es_index, doc_type=es_type, id=es_id)
        # es.exists returns a true or false.
        #   Always report that the function was successful,
        #   and leave the result in the second return value
        return True, exists_ret

    def delete_document(self, es_index, es_type, es_id):
        es_del_raw = self.es.delete(index=es_index, doc_type=es_type, id=es_id)
        es_del_json = json.loads(json.dumps(es_del_raw))
        if self.UTIL.safe_list_read(es_del_json, 'found'):
            return True, es_del_raw
        else:
            return False, es_del_raw

    def get_document(self, es_index, es_type, es_id):
        es_get_raw = self.es.get(index=es_index, doc_type=es_type, id=es_id)
        es_get_json = json.loads(json.dumps(es_get_raw))
        if self.UTIL.safe_list_read(es_get_json, 'found'):
            return True, es_get_raw
        else:
            return False, es_get_raw

    def function_with_timeout(self, timeout, function, *args):
        keep_running = True
        start_time = time.time()
        itr = 1
        func_status = False
        func_ret = "Not yet run"
        while not self.UTIL.time_has_run_out(start_time, time.time(), timeout) and keep_running:
            self.logging.info("try_with_timeout: Attempting run number " + str(itr) + " of function")
            try:
                func_status, func_ret = function(*args)
            except elasticsearch.TransportError as es1:
                self.logging.info("Caught elasticsearch TransportError exception: Status Code: " + str(es1.status_code) + ". Retrying...")
                if es1.status_code == 409 or es1.status_code == 404:
                    # 409 - DocumentAlreadyExistsException
                    # 404 - DocumentNotFound
                    func_status = True
                else:
                    func_status = False
            except Exception as e:
                self.logging.info("Caught generic elasticsearch exception.")
                self.logging.info("e: " + str(e) + " Retrying...")
                func_status = False
                if func_status:
                    keep_running = False
                    return func_status, func_ret
            itr += 1
        return False, "Function timed out if it got this far"


    def get_request_as_json(self, es_index, es_type, es_id):
        found, raw = self.function_with_timeout(self.ES_REQUEST_TIMEOUT,
                                               self.get_document,
                                                es_index,
                                                es_type,
                                                es_id)
        return json.loads(json.dumps(raw))

class Utility:

    OUTPUT_FILE = "export.json"
    INDENT_LEVEL = 3
    MAIN_LOG_PATH_DEFAULT='/var/log/probe/KibanaStartup.log'
    LOGGER = None
    logging = None
    rotating_handler = None

    def __init__(self, log_file=MAIN_LOG_PATH_DEFAULT):
        self.LOGGER = LogConfig(log_file)
        self.logging, self.rotating_handler = self.LOGGER.configure_and_return_logging()

    def make_json(self, content):
        return json.loads(json.dumps(content))

    def pretty_format(self, raw_json_content):
        json_obj = json.loads(json.dumps(raw_json_content))
        return json.dumps(json_obj, indent = self.INDENT_LEVEL)

    def copy_dict_keys(self, dict):
        return dict.fromkeys(dict.keys(), 0)

    def safe_list_read(self, list_ob, key):
        try:
            value = list_ob[key]
            return value
        except:
            self.logging.warning("No element in list for index: " + key)
            return ""

    def time_has_run_out(self, start, curr, max):
        return curr - start > max

    def read_json_from_file(self, filename):
        with open(filename) as file_raw:
            return json.load(file_raw)

    def remove_all_char(self, string, to_remove):
        return string.replace(to_remove, "")

    def print_to_file(self, content, filename=OUTPUT_FILE):
        with open(filename, 'w') as outputfile:
            json.dump(content, outputfile, indent=self.INDENT_LEVEL)
