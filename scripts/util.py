#!/usr/bin/python

# Copyright 2019 LogRhythm, Inc
# Licensed under the LogRhythm Global End User License Agreement,
# which can be found through this page: https://logrhythm.com/about/logrhythm-terms-and-conditions/

import json
import time

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


class Utility:
    OUTPUT_FILE = 'export.json'
    INDENT_LEVEL = 3
    MAIN_LOG_PATH_DEFAULT='/var/log/probe/KibanaStartup.log'
    LOGGER = None
    logging = None
    rotating_handler = None

    def __init__(self, log_file=MAIN_LOG_PATH_DEFAULT):
        self.LOGGER = LogConfig(log_file)
        self.logging, self.rotating_handler = self.LOGGER.configure_and_return_logging()

    def get_logging(self):
        return self.logging, self.rotating_handler

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
            self.logging.warning('No element in list for index: ' + key)
            return ''

    def time_has_run_out(self, start, curr, max):
        return curr - start > max

    def read_json_from_file(self, filename):
        with open(filename) as file_raw:
            return json.load(file_raw)

    def remove_all_char(self, string, to_remove):
        return string.replace(to_remove, '')

    def print_to_file(self, content, filename=OUTPUT_FILE):
        with open(filename, 'w') as outputfile:
            json.dump(content, outputfile, indent=self.INDENT_LEVEL)
