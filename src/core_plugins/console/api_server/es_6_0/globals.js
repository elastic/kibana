const highlightOptions = {
  boundary_chars: {},
  boundary_max_scan: 20,
  boundary_scanner: {
    __one_of: [ 'chars', 'sentence', 'word' ]
  },
  boundary_scanner_locale: {},
  encoder: {
    __one_of: [ 'default', 'html' ]
  },
  force_source: {
    __one_of: [ 'false', 'true' ]
  },
  fragmenter: {
    __one_of: [ 'simple', 'span' ]
  },
  highlight_query: {
    __scope_link: 'GLOBAL.query'
  },
  matched_fields: ['FIELD'],
  order: {},
  no_match_size: 0,
  number_of_fragments: 5,
  phrase_limit: 256,
  pre_tags: {},
  post_tags: {},
  require_field_match: {
    __one_of: [ 'true', 'false' ]
  },
  tags_schema: {}
};
export default function (api) {
  api.addGlobalAutocompleteRules('highlight', {
    ...highlightOptions,
    fields: {
      '{field}': {
        fragment_size: 20,
        number_of_fragments: 3,
        ...highlightOptions
      }
    }
  });

  api.addGlobalAutocompleteRules('script', {
    __template: {
      inline: 'SCRIPT'
    },
    inline: 'SCRIPT',
    file: 'FILE_SCRIPT_NAME',
    id: 'SCRIPT_ID',
    lang: '',
    params: {}
  });
}
