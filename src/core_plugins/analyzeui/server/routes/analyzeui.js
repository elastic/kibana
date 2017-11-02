import { convertEsError } from './handle_es_error';

export function analyzeRoute(server) {

  const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');

  server.route({
    path: '/api/analyzeui/analyze',
    method: 'POST',
    handler(req, reply) {

      // get params from req
      // call _analyze api
      const param = {
        body: {
          explain: true,
          text: req.payload.text
        }
      };
      if (req.payload.indexName) param.index = req.payload.indexName;
      if (req.payload.analyzer) param.body.analyzer = req.payload.analyzer;
      if (req.payload.tokenizer) param.body.tokenizer = req.payload.tokenizer;
      if (req.payload.charfilters) param.body.char_filter = req.payload.charfilters;
      if (req.payload.field) param.body.field = req.payload.field;
      if (req.payload.filters) param.body.filter = req.payload.filters;
      try {
        callWithRequest(req, 'indices.analyze', param)
          .then(function (response) {
            const res = {
              detail: response.detail,
              request: param.body
            };
            reply(res);
          })
          .catch(error => {
            reply(convertEsError(error));
          });
      } catch (error) {
        reply(convertEsError(error));
      }
    }
  });

  server.route({
    path: '/api/analyzeui/multi_analyze',
    method: 'POST',
    handler(req, reply) {

      // get params from req
      // call _analyze api
      const param = {
        body: {
          explain: false,
          text: req.payload.text
        }
      };
      if (req.payload.indexName) param.index = req.payload.indexName;
      const res = {
        resultAnalyzers: []
      };

      try {
        function getAnalyzerResult(analyzer) {
          return new Promise(function (resolve, reject) {
            param.body.analyzer = analyzer.item;
            callWithRequest(req, 'indices.analyze', param)
              .then(function (response) {
                res.resultAnalyzers.push({ analyzer: analyzer.item, id: analyzer.id, tokens: response.tokens });
                resolve(res);
              })
              .catch(error => {
                reject(convertEsError(error));
              });
          });
        }

        if (Array.isArray(req.payload.analyzers) && req.payload.analyzers.length >= 1) {
          Promise.all(
            req.payload.analyzers.map(getAnalyzerResult))
            .then(function () {
              reply(res);
            })
            .catch(error => {
              reply(convertEsError(error));
            });
        } else {
          reply(res);
        }
      } catch (error) {
        reply(convertEsError(error));
      }
    }
  });

}
