/**
 * ELASTICSEARCH CONFIDENTIAL
 * _____________________________
 *
 *  [2014] Elasticsearch Incorporated All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Elasticsearch Incorporated and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Elasticsearch Incorporated
 * and its suppliers and may be covered by U.S. and Foreign Patents,
 * patents in process, and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Elasticsearch Incorporated.
 */



'use strict';

module.exports = function (api) {
  api.addGlobalAutocompleteRules('highlight', {
    pre_tags: {},
    post_tags: {},
    tags_schema: {},
    fields: {
      '{field}': {
        fragment_size: 20,
        number_of_fragments: 3
      }
    }
  });

  api.addGlobalAutocompleteRules('script', {
    __template: {
      inline: "SCRIPT"
    },
    inline: "SCRIPT",
    file: "FILE_SCRIPT_NAME",
    id: "SCRIPT_ID",
    lang: "",
    params: {}
  });
};
