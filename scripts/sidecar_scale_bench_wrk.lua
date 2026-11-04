wrk.method = "POST"
wrk.headers["Content-Type"] = "application/json"
wrk.headers["elastic-api-version"] = "1"
wrk.headers["kbn-build-number"] = "9007199254740991"
wrk.headers["kbn-version"] = "9.7.0"
wrk.headers["kbn-system-request"] = "true"
wrk.headers["x-elastic-internal-origin"] = "Kibana"

wrk.body = '{"params":{"body":{"query":{"bool":{"must":[],"filter":[{"range":{"@timestamp":{"format":"strict_date_optional_time","gte":"2022-09-07T10:53:30.262Z","lte":"2022-09-07T10:55:09.280Z"}}}],"should":[],"must_not":[]}},"aggs":{"0":{"terms":{"field":"field0","order":{"_count":"desc"},"size":1000},"aggs":{"1":{"date_histogram":{"field":"@timestamp","fixed_interval":"99ms","time_zone":"America/Denver","extended_bounds":{"min":1662548010262,"max":1662548109280}}}}}},"size":0,"_source":{"excludes":[]},"stored_fields":["*"],"runtime_mappings":{},"script_fields":{},"fields":[{"field":"@timestamp","format":"date_time"}]},"index":"stresstest","preference":"bench"},"sessionId":"bench-scale","isRestore":false,"isStored":false,"isSearchStored":false,"requestHash":"bench","stream":true}'

local cookies = {}
local req_count = 0

function init(args)
  local cookie_file = os.getenv("WRK_COOKIE_FILE")
  if cookie_file then
    for line in io.lines(cookie_file) do
      if line ~= "" then
        cookies[#cookies + 1] = line
      end
    end
  end
end

function request()
  if #cookies > 0 then
    req_count = req_count + 1
    local cookie = cookies[((req_count - 1) % #cookies) + 1]
    return wrk.format(wrk.method, wrk.path, {
      ["Content-Type"] = "application/json",
      ["elastic-api-version"] = "1",
      ["kbn-build-number"] = "9007199254740991",
      ["kbn-version"] = "9.7.0",
      ["kbn-system-request"] = "true",
      ["x-elastic-internal-origin"] = "Kibana",
      ["Cookie"] = cookie,
    }, wrk.body)
  end
  return wrk.format(wrk.method, wrk.path, wrk.headers, wrk.body)
end
