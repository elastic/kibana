var Promise = require('bluebird');

var argv = require('./argv');
var client = require('./_client');
var omitFields = require('./_omitFields');
var confirmReset = require('./_confirmReset');

module.exports = function createIndex() {
  var indexTemplate = argv.indexPrefix + '*'
  var indexTemplateName = 'makelogs_index_template__' + argv.indexPrefix;

  var body = {
    template: indexTemplate,
    settings: {
      index: {
        number_of_shards: argv.shards,
        number_of_replicas: argv.replicas,
      },
      analysis: {
        analyzer: {
          makelogs_url: {
            type: 'standard',
            tokenizer: 'uax_url_email',
            max_token_length: 1000
          }
        }
      }
    },
    mappings: {
      _default_: {
        dynamic_templates: [
          {
            string_fields: {
              match_mapping_type: 'string',
              match: '*',

              mapping: {
                type: 'string',
                index: 'analyzed',
                omit_norms: true,
                doc_values: false,

                fields: {
                  raw: {
                    index: 'not_analyzed',
                    type: 'string',
                    doc_values: true,
                  }
                }
              }
            }
          }
        ],

        // meta fields
        _timestamp: {
          enabled: true
        },

        // properties
        properties: omitFields({
          '@timestamp': {
            type: 'date'
          },
          id: {
            type: 'integer',
            index: 'true',
            include_in_all: false
          },
          clientip: {
            type: 'ip'
          },
          ip: {
            type: 'ip'
          },
          memory: {
            type: 'double'
          },
          referer: {
            type: 'string',
            index: 'not_analyzed'
          },
          geo: {
            properties: {
              srcdest: {
                type: 'string',
                index: 'not_analyzed'
              },
              dest: {
                type: 'string',
                index: 'not_analyzed'
              },
              src: {
                type: 'string',
                index: 'not_analyzed'
              },
              coordinates: {
                type: 'geo_point'
              }
            }
          },
          meta: {
            properties: {
              related: {
                type: 'string',
              },
              char: {
                type: 'string',
                index: 'not_analyzed'
              },
              user: {
                properties: {
                  firstname: {
                    type: 'string',
                  },
                  lastname: {
                    type: 'integer',
                    index: 'true'
                  }
                }
              }
            }
          }
        }, true)
      }
    }
  }

  return client.usable
  .then(function () {
    return Promise.props({
      template: client.indices.existsTemplate({
        name: indexTemplateName
      }),
      indices: client.indices.exists({
        index: indexTemplate
      })
    });
  })
  .then(function (exists) {
    function clearExisting() {
      console.log('clearing existing "%s" index templates and indices', indexTemplate);
      return Promise.all([
        client.indices.deleteTemplate({
          ignore: 404,
          name: indexTemplateName
        }),
        client.indices.delete({
          ignore: 404,
          index: indexTemplate
        })
      ]);
    }

    function create() {
      console.log('creating index template for "%s"', indexTemplate);
      return client.indices.putTemplate({
        ignore: 400,
        name: indexTemplateName,
        body: body
      });
    }

    function maybeReset(reset) {
      switch (reset) {
      case true:
        return clearExisting().then(create);
      case false:
        if (!exists.indices) {
          return create();
        } else {
          return; // do nothing, index template exists
        }
      default:
        return confirmReset().then(maybeReset);
      }
    }

    if (exists.template || exists.indices) {
      return maybeReset(argv.reset);
    } else {
      return create();
    }
  });
};
