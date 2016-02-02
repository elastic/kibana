const keysDeep = require('../lib/keys_deep');
const _ = require('lodash');

export default [
  { // append
    typeId: 'append',
    title: 'Append',
    targetField: '',
    values: [],
    getDefinition: function (processor) {
      return {
        'append' : {
          'tag': processor.processorId,
          'field' : processor.targetField ? processor.targetField : '',
          'value': processor.values
        }
      };
    },
    getDescription: function (processor) {
      const target = (processor.targetField) ? processor.targetField : '?';
      return `[${target}]`;
    }
  },
  { // convert
    typeId: 'convert',
    title: 'Convert',
    sourceField: '',
    type: 'string',
    getDefinition: function (processor) {
      return {
        'convert' : {
          'tag': processor.processorId,
          'field' : processor.sourceField ? processor.sourceField : '',
          'type' : processor.type ? processor.type : ''
        }
      };
    },
    getDescription: function (processor) {
      const source = (processor.sourceField) ? processor.sourceField : '?';
      const type = (processor.type) ? processor.type : '?';
      return `[${source}] to ${type}`;
    }
  },
  { // date
    typeId: 'date',
    title: 'Date',
    sourceField: '',
    targetField: '@timestamp',
    formats: [],
    timezone: 'Etc/UTC',
    locale: 'ENGLISH',
    customFormat: '',
    getDefinition: function (processor) {
      const formats = [];
      processor.formats.forEach((format) => {
        if (format === 'Custom') {
          if (processor.customFormat) {
            formats.push(processor.customFormat);
          }
        } else {
          formats.push(format);
        }
      });

      return {
        'date' : {
          'tag': processor.processorId,
          'match_field' : processor.sourceField ? processor.sourceField : '',
          'target_field' : processor.targetField ? processor.targetField : '',
          'match_formats' : formats,
          'timezone': processor.timezone ? processor.timezone : '',
          'locale': processor.locale ? processor.locale : ''
        }
      };
    },
    getDescription: function (processor) {
      const source = (processor.sourceField) ? processor.sourceField : '?';
      const target = (processor.targetField) ? processor.targetField : '?';
      return `[${source}] -> [${target}]`;
    }
  },
  { // geoip
    typeId: 'geoip',
    title: 'Geo IP',
    sourceField: '',
    targetField: 'geoip',
    getDefinition: function (processor) {
      return {
        'geoip' : {
          'tag': processor.processorId,
          'source_field' : processor.sourceField ? processor.sourceField : '',
          'target_field': processor.targetField ? processor.targetField : ''
        }
      };
    },
    getDescription: function (processor) {
      const source = (processor.sourceField) ? processor.sourceField : '?';
      const target = (processor.targetField) ? processor.targetField : '?';
      return `[${source}] -> [${target}]`;
    }
  },
  { // grok
    typeId: 'grok',
    title: 'Grok',
    sourceField: '',
    pattern: '',
    getDefinition: function (processor) {
      return {
        'grok' : {
          'tag': processor.processorId,
          'field' : processor.sourceField ? processor.sourceField : '',
          'pattern': processor.pattern ? processor.pattern : '',
        }
      };
    },
    getDescription: function (processor) {
      let inputKeys = keysDeep(processor.inputObject);
      let outputKeys = keysDeep(processor.outputObject);
      let added = _.difference(outputKeys, inputKeys);

      let addedDescription = added.sort().map(field => `[${field}]`).join(', ');

      const source = (processor.sourceField) ? processor.sourceField : '?';
      return `[${source}] -> ${addedDescription}`;
    }
  },
  { // gsub
    typeId: 'gsub',
    title: 'Gsub',
    sourceField: '',
    pattern: '',
    replacement: '',
    getDefinition: function (processor) {
      return {
        'gsub' : {
          'tag': processor.processorId,
          'field' : processor.sourceField ? processor.sourceField : '',
          'pattern' : processor.pattern ? processor.pattern : '',
          'replacement' : processor.replacement ? processor.replacement : ''
        }
      };
    },
    getDescription: function (processor) {
      const source = (processor.sourceField) ? processor.sourceField : '?';
      return `[${source}] - '${processor.pattern}' -> '${processor.replacement}'`;
    }
  },
  { // join
    typeId: 'join',
    title: 'Join',
    sourceField: '',
    separator: '',
    getDefinition: function (processor) {
      return {
        'join' : {
          'tag': processor.processorId,
          'field' : processor.sourceField ? processor.sourceField : '',
          'separator' : processor.separator ? processor.separator : ''
        }
      };
    },
    getDescription: function (processor) {
      const source = (processor.sourceField) ? processor.sourceField : '?';
      const separator = (processor.separator) ? processor.separator : '?';
      return `[${source}] on '${separator}'`;
    }
  },
  { // lowercase
    typeId: 'lowercase',
    title: 'Lowercase',
    sourceField: '',
    getDefinition: function (processor) {
      return {
        'lowercase' : {
          'tag': processor.processorId,
          'field' : processor.sourceField ? processor.sourceField : ''
        }
      };
    },
    getDescription: function (processor) {
      const source = (processor.sourceField) ? processor.sourceField : '?';
      return `[${source}]`;
    }
  },
  { // remove
    typeId: 'remove',
    title: 'Remove',
    sourceField: '',
    getDefinition: function (processor) {
      return {
        'remove' : {
          'tag': processor.processorId,
          'field' : processor.sourceField ? processor.sourceField : ''
        }
      };
    },
    getDescription: function (processor) {
      const source = (processor.sourceField) ? processor.sourceField : '?';
      return `[${source}]`;
    }
  },
  { // rename
    typeId: 'rename',
    title: 'Rename',
    sourceField: '',
    targetField: '',
    getDefinition: function (processor) {
      return {
        'rename' : {
          'tag': processor.processorId,
          'field' : processor.sourceField ? processor.sourceField : '',
          'to': processor.targetField ? processor.targetField : ''
        }
      };
    },
    getDescription: function (processor) {
      const source = (processor.sourceField) ? processor.sourceField : '?';
      const target = (processor.targetField) ? processor.targetField : '?';
      return `[${source}] -> [${target}]`;
    }
  },
  { // set
    typeId: 'set',
    title: 'Set',
    targetField: '',
    getDefinition: function (processor) {
      return {
        'set' : {
          'tag': processor.processorId,
          'field' : processor.targetField ? processor.targetField : '',
          'value': processor.value ? processor.value : ''
        }
      };
    },
    getDescription: function (processor) {
      const target = (processor.targetField) ? processor.targetField : '?';
      return `[${target}]`;
    }
  },
  { // split
    typeId: 'split',
    title: 'Split',
    sourceField: '',
    separator: '',
    getDefinition: function (processor) {
      return {
        'split' : {
          'tag': processor.processorId,
          'field' : processor.sourceField ? processor.sourceField : '',
          'separator' : processor.separator ? processor.separator : ''
        }
      };
    },
    getDescription: function (processor) {
      const source = (processor.sourceField) ? processor.sourceField : '?';
      const separator = (processor.separator) ? processor.separator : '?';
      return `[${source}] on '${separator}'`;
    }
  },
  { // trim
    typeId: 'trim',
    title: 'Trim',
    sourceField: '',
    getDefinition: function (processor) {
      return {
        'trim' : {
          'tag': processor.processorId,
          'field' : processor.sourceField ? processor.sourceField : ''
        }
      };
    },
    getDescription: function (processor) {
      const source = (processor.sourceField) ? processor.sourceField : '?';
      return `[${source}]`;
    }
  },
  { // uppercase
    typeId: 'uppercase',
    title: 'Uppercase',
    sourceField: '',
    getDefinition: function (processor) {
      return {
        'uppercase' : {
          'tag': processor.processorId,
          'field' : processor.sourceField ? processor.sourceField : ''
        }
      };
    },
    getDescription: function (processor) {
      const source = (processor.sourceField) ? processor.sourceField : '?';
      return `[${source}]`;
    }
  },
];
