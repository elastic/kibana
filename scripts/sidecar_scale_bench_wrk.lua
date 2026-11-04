wrk.method = "POST"
wrk.headers["Content-Type"] = "application/json"
wrk.headers["elastic-api-version"] = "1"
wrk.headers["kbn-build-number"] = "9007199254740991"
wrk.headers["kbn-version"] = "9.7.0"
wrk.headers["kbn-system-request"] = "true"
wrk.headers["x-elastic-internal-origin"] = "Kibana"

wrk.body = '{"params":{"body":{"query":{"bool":{"must":[],"filter":[{"range":{"@timestamp":{"format":"strict_date_optional_time","gte":"2022-09-07T10:53:30.262Z","lte":"2022-09-07T10:55:09.280Z"}}}],"should":[],"must_not":[]}},"aggs":{"0":{"terms":{"field":"field0","order":{"_count":"desc"},"size":1000},"aggs":{"1":{"date_histogram":{"field":"@timestamp","fixed_interval":"99ms","time_zone":"America/Denver","extended_bounds":{"min":1662548010262,"max":1662548109280}}}}}},"size":0,"_source":{"excludes":[]},"stored_fields":["*"],"runtime_mappings":{},"script_fields":{},"fields":[{"field":"@timestamp","format":"date_time"}]},"index":"stresstest","preference":"bench"},"sessionId":"bench-scale","isRestore":false,"isStored":false,"isSearchStored":false,"requestHash":"bench","stream":true}'
