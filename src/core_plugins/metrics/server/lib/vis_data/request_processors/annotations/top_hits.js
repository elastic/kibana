import _ from 'lodash';
export default function topHits(req, panel, annotation) {
  return next => doc => {
    const fields = annotation.fields && annotation.fields.split(/[,\s]+/) || [];
    const timeField = annotation.time_field;
    _.set(doc, `aggs.${annotation.id}.aggs.hits.top_hits`, {
      sort: [
        {
          [timeField]: { order: 'desc' }
        }
      ],
      _source: {
        includes: [
          ...fields,
          timeField
        ]
      },
      size: 5
    });
    return next(doc);
  };
}
