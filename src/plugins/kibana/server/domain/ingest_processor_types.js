const keysDeep = require('../lib/keys_deep');

const processor_types = [
  { // append
    typeId: 'append',
    title: 'Append',
    targetField: '',
    values: [],
    getDefinition: function() {
      const self = this;
      return {
        'append' : {
          'processor_id': self.processorId,
          'field' : self.targetField ? self.targetField : '',
          'value': self.values
        }
      };
    },
    getDescription: function() {
      const self = this;

      const target = (self.targetField) ? self.targetField : '?';
      return `[${target}]`;
    }
  },
  { // convert
    typeId: 'convert',
    title: 'Convert',
    sourceField: '',
    type: '',
    getDefinition: function() {
      const self = this;
      return {
        'convert' : {
          'processor_id': self.processorId,
          'field' : self.sourceField ? self.sourceField : '',
          'type' : self.type ? self.type : ''
        }
      };
    },
    getDescription: function() {
      const self = this;

      const source = (self.sourceField) ? self.sourceField : '?';
      const type = (self.type) ? self.type : '?';
      return `[${source}] to ${type}`;
    }
  },
  { // date
    typeId: 'date',
    title: 'Date',
    sourceField: '',
    targetField: '@timestamp',
    formats: [],
    timezone: 'UTC',
    locale: 'ENGLISH',
    customFormat: '',
    getDefinition: function() {
      const self = this;

      const formats = [];
      self.formats.forEach((format) => {
        if (format === 'Custom') {
          if (self.customFormat) {
            formats.push(self.customFormat);
          }
        } else {
          formats.push(format);
        }
      });

      return {
        'date' : {
          'processor_id': self.processorId,
          'match_field' : self.sourceField ? self.sourceField : '',
          'target_field' : self.targetField ? self.targetField : '',
          'match_formats' : formats,
          'timezone': self.timezone ? self.timezone : '',
          'locale': self.locale ? self.locale : ''
        }
      };
    },
    getDescription: function() {
      const self = this;

      const source = (self.sourceField) ? self.sourceField : '?';
      const target = (self.targetField) ? self.targetField : '?';
      return `[${source}] -> [${target}]`;
    }
  },
  { // geoip
    typeId: 'geoip',
    title: 'Geo IP',
    sourceField: '',
    targetField: 'geoip',
    getDefinition: function() {
      const self = this;
      return {
        'geoip' : {
          'processor_id': self.processorId,
          'source_field' : self.sourceField ? self.sourceField : '',
          'target_field': self.targetField ? self.targetField : ''
        }
      };
    },
    getDescription: function() {
      const self = this;

      const source = (self.sourceField) ? self.sourceField : '?';
      const target = (self.targetField) ? self.targetField : '?';
      return `[${source}] -> [${target}]`;
    }
  },
  { // grok
    typeId: 'grok',
    title: 'Grok',
    sourceField: '',
    pattern: '',
    getDefinition: function() {
      const self = this;
      return {
        'grok' : {
          'processor_id': self.processorId,
          'field' : self.sourceField ? self.sourceField : '',
          'pattern': self.pattern ? self.pattern : '',
        }
      };
    },
    getDescription: function() {
      const self = this;

      let inputKeys = keysDeep(self.inputObject);
      let outputKeys = keysDeep(self.outputObject);
      let added = _.difference(outputKeys, inputKeys);

      let addedDescription = added.sort().map(field => `[${field}]`).join(', ');

      const source = (self.sourceField) ? self.sourceField : '?';
      return `[${source}] -> ${addedDescription}`;
    }
  },
  { // gsub
    typeId: 'gsub',
    title: 'Gsub',
    sourceField: '',
    pattern: '',
    replacement: '',
    getDefinition: function() {
      const self = this;
      return {
        'gsub' : {
          'processor_id': self.processorId,
          'field' : self.sourceField ? self.sourceField : '',
          'pattern' : self.pattern ? self.pattern : '',
          'replacement' : self.replacement ? self.replacement : ''
        }
      };
    },
    getDescription: function() {
      const self = this;

      const source = (self.sourceField) ? self.sourceField : '?';
      return `[${source}] - '${self.pattern}' -> '${self.replacement}'`;
    }
  },
  { // join
    typeId: 'join',
    title: 'Join',
    sourceField: '',
    separator: '',
    getDefinition: function() {
      const self = this;
      return {
        'join' : {
          'processor_id': self.processorId,
          'field' : self.sourceField ? self.sourceField : '',
          'separator' : self.separator ? self.separator : ''
        }
      };
    },
    getDescription: function() {
      const self = this;

      const source = (self.sourceField) ? self.sourceField : '?';
      const separator = (self.separator) ? self.separator : '?';
      return `[${source}] on '${separator}'`;
    }
  },
  { // lowercase
    typeId: 'lowercase',
    title: 'Lowercase',
    sourceField: '',
    getDefinition: function() {
      const self = this;
      return {
        'lowercase' : {
          'processor_id': self.processorId,
          'field' : self.sourceField ? self.sourceField : ''
        }
      };
    },
    getDescription: function() {
      const self = this;

      const source = (self.sourceField) ? self.sourceField : '?';
      return `[${source}]`;
    }
  },
  { // remove
    typeId: 'remove',
    title: 'Remove',
    sourceField: '',
    getDefinition: function() {
      const self = this;
      return {
        'remove' : {
          'processor_id': self.processorId,
          'field' : self.sourceField ? self.sourceField : ''
        }
      };
    },
    getDescription: function() {
      const self = this;

      const source = (self.sourceField) ? self.sourceField : '?';
      return `[${source}]`;
    }
  },
  { // rename
    typeId: 'rename',
    title: 'Rename',
    sourceField: '',
    targetField: '',
    getDefinition: function() {
      const self = this;
      return {
        'rename' : {
          'processor_id': self.processorId,
          'field' : self.sourceField ? self.sourceField : '',
          'to': self.targetField ? self.targetField : ''
        }
      };
    },
    getDescription: function() {
      const self = this;

      const source = (self.sourceField) ? self.sourceField : '?';
      const target = (self.targetField) ? self.targetField : '?';
      return `[${source}] -> [${target}]`;
    }
  },
  { // set
    typeId: 'set',
    title: 'Set',
    targetField: '',
    getDefinition: function() {
      const self = this;
      return {
        'set' : {
          'processor_id': self.processorId,
          'field' : self.targetField ? self.targetField : '',
          'value': self.value ? self.value : ''
        }
      };
    },
    getDescription: function() {
      const self = this;

      const target = (self.targetField) ? self.targetField : '?';
      return `[${target}]`;
    }
  },
  { // split
    typeId: 'split',
    title: 'Split',
    sourceField: '',
    separator: '',
    getDefinition: function() {
      const self = this;
      return {
        'split' : {
          'processor_id': self.processorId,
          'field' : self.sourceField ? self.sourceField : '',
          'separator' : self.separator ? self.separator : ''
        }
      };
    },
    getDescription: function() {
      const self = this;

      const source = (self.sourceField) ? self.sourceField : '?';
      const separator = (self.separator) ? self.separator : '?';
      return `[${source}] on '${separator}'`;
    }
  },
  { // trim
    typeId: 'trim',
    title: 'Trim',
    sourceField: '',
    getDefinition: function() {
      const self = this;
      return {
        'trim' : {
          'processor_id': self.processorId,
          'field' : self.sourceField ? self.sourceField : ''
        }
      };
    },
    getDescription: function() {
      const self = this;

      const source = (self.sourceField) ? self.sourceField : '?';
      return `[${source}]`;
    }
  },
  { // uppercase
    typeId: 'uppercase',
    title: 'Uppercase',
    sourceField: '',
    getDefinition: function() {
      const self = this;
      return {
        'uppercase' : {
          'processor_id': self.processorId,
          'field' : self.sourceField ? self.sourceField : ''
        }
      };
    },
    getDescription: function() {
      const self = this;

      const source = (self.sourceField) ? self.sourceField : '?';
      return `[${source}]`;
    }
  },
];

export default processor_types;
