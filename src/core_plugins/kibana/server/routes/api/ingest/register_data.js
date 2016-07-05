import { Promise } from 'bluebird';
import parse from 'csv-parse';
import _ from 'lodash';
import hi from 'highland';
import { patternToIngest } from '../../../../common/lib/convert_pattern_and_ingest_name';
import { PassThrough } from 'stream';
import JSONStream from 'JSONStream';

const ONE_GIGABYTE = 1024 * 1024 * 1024;

export function registerData(server) {
  server.route({
    path: '/api/kibana/{id}/_data',
    method: 'POST',
    config: {
      payload: {
        output: 'stream',
        maxBytes: ONE_GIGABYTE
      }
    },
    handler: function (req, reply) {
      const boundCallWithRequest = _.partial(server.plugins.elasticsearch.callWithRequest, req);
      const indexPattern = req.params.id;
      const usePipeline = req.query.pipeline === 'true';
      const delimiter = _.get(req.query, 'csv_delimiter', ',');
      const responseStream = new PassThrough();
      const parser = parse({
        columns: true,
        auto_parse: true,
        delimiter: delimiter,
        skip_empty_lines: true
      });

      const csv = req.payload.csv ? req.payload.csv : req.payload;
      const fileName = req.payload.csv ? csv.hapi.filename : '';

      let currentLine = 2; // Starts at 2 since we parse the header separately

      csv.pipe(parser);

      hi(parser)
      .consume((err, doc, push, next) => {
        if (err) {
          push(err, null);
          next();
        }
        else if (doc === hi.nil) {
          // pass nil (end event) along the stream
          push(null, doc);
        }
        else {
          push(null, {index: _.isEmpty(fileName) ? {} : {_id: `${fileName}:${currentLine}`}});
          push(null, doc);
          currentLine++;
          next();
        }
      })
      .batch(200)
      .map((bulkBody) => {
        const bulkParams = {
          index: indexPattern,
          type: 'default',
          body: bulkBody
        };

        if (usePipeline) {
          bulkParams.pipeline = patternToIngest(indexPattern);
        }

        return hi(boundCallWithRequest('bulk', bulkParams));
      })
      .parallel(2)
      .map((response) => {
        return _.reduce(response.items, (memo, docResponse) => {
          const indexResult = docResponse.index;
          if (indexResult.error) {
            const hasIndexingErrors = _.isUndefined(_.get(memo, 'errors.index'));
            if (hasIndexingErrors) {
              _.set(memo, 'errors.index', []);
            }
            memo.errors.index.push(_.pick(indexResult, ['_id', 'error']));
          }
          else {
            memo.created++;
          }

          return memo;
        }, {created: 0});
      })
      .stopOnError((err, push) => {
        push(null, {created: 0, errors: {other: [err.message]}});
      })
      .pipe(JSONStream.stringify())
      .pipe(responseStream);

      reply(responseStream).type('application/json');
    }
  });
}
