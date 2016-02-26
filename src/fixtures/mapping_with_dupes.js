export default {
  test: {
    mappings: {
      testType: {
        'baz': {
          full_name: 'baz',
          mapping: {
            bar: {
              type: 'long'
            }
          }
        },
        'foo.bar': {
          full_name: 'foo.bar',
          mapping: {
            bar: {
              type: 'string'
            }
          }
        }
      }
    }
  },
  duplicates: {
    mappings: {
      testType: {
        'baz': {
          full_name: 'baz',
          mapping: {
            bar: {
              type: 'date'
            }
          }
        }
      }
    }
  }
};