/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RuntimeMessagePool, Runtime } from '../types';

export const REQUEST: {
  success: Partial<Record<Runtime, string[]>>;
  internal_error: RuntimeMessagePool;
  bad_gateway: RuntimeMessagePool;
  gateway_timeout: RuntimeMessagePool;
  stack_traces: Partial<Record<Runtime, string[]>>;
} = {
  success: {
    go: [`level=info msg="{app_pascal}Service.handle completed" request_id={request_id}`],
    python: [
      `INFO     app.{app_snake}  {app_pascal}Service.handle completed request_id={request_id}`,
    ],
    java: [
      `[{thread}] INFO  {app_pkg}.{app_pascal}Service - request processed user_id={user_id} trace_id={request_id} trace_flags=01`,
    ],
    node: [`{"level":"info","msg":"{app_pascal}Service.handle completed","reqId":"{request_id}"}`],
  },
  internal_error: {
    go: {
      warn: [`level=warn msg="goroutine count elevated" count=450 limit=1000`],
      error: [
        `level=error msg="recovered from panic" error="runtime error: invalid memory address or nil pointer dereference" request_id={request_id}`,
      ],
    },
    python: {
      warn: [`WARNING  app.health  heap size approaching limit used_mb=480 limit_mb=512`],
      error: [
        `ERROR    app.handler  Unhandled exception in process_request request_id={request_id}`,
      ],
    },
    java: {
      warn: [
        `[{thread}] WARN  {app_pkg}.HealthCheck - Thread pool nearing saturation active=48 max=50`,
      ],
      error: [
        `[{thread}] ERROR {app_pkg}.RequestHandler - Unhandled exception processing request rid={request_id}`,
      ],
    },
    node: {
      warn: [`{"level":"warn","msg":"event loop lag detected","lagMs":85}`],
      error: [
        `{"level":"error","msg":"unhandled error in request handler","status":"{status}","err":{"type":"TypeError","message":"Cannot read properties of undefined"},"reqId":"{request_id}"}`,
      ],
    },
  },
  bad_gateway: {
    go: {
      warn: [
        `level=warn msg="upstream health degraded" target={upstream_host} consecutive_errors=3`,
      ],
      error: [
        `level=error msg="bad gateway" target={upstream_host} upstream_status={upstream_status} rid={request_id}`,
      ],
    },
    node: {
      warn: [
        `{"level":"warn","msg":"upstream health degraded","target":"{upstream_host}","consecutiveErrors":3}`,
      ],
      error: [
        `{"level":"error","msg":"upstream returned error","target":"{upstream_host}","upstreamStatus":{upstream_status},"reqId":"{request_id}"}`,
      ],
    },
    python: {
      warn: [`WARNING  app.http  upstream degraded target={upstream_host} consecutive_errors=3`],
      error: [
        `ERROR    app.http  Bad gateway calling {upstream_host}: upstream_status={upstream_status} request_id={request_id}`,
      ],
    },
    java: {
      warn: [
        `[{thread}] WARN  {app_pkg}.HttpClient - upstream health degraded target={upstream_host} consecutiveErrors=3`,
      ],
      error: [
        `[{thread}] ERROR {app_pkg}.HttpClient - Bad gateway from {upstream_host}: status={upstream_status} rid={request_id}`,
      ],
    },
  },
  gateway_timeout: {
    go: {
      warn: [
        `level=warn msg="circuit breaker: error rate approaching threshold" target={upstream_host} rate=0.22`,
      ],
      error: [
        `level=error msg="context deadline exceeded calling downstream" target={upstream_host} rid={request_id}`,
      ],
    },
    node: {
      warn: [
        `{"level":"warn","msg":"circuit breaker threshold approaching","target":"{upstream_host}","errorRate":0.22}`,
      ],
      error: [
        `{"level":"error","msg":"downstream timeout","target":"{upstream_host}","err":{"type":"Error","message":"4 DEADLINE_EXCEEDED: Deadline exceeded"},"reqId":"{request_id}"}`,
      ],
    },
    python: {
      warn: [
        `WARNING  app.http  circuit breaker threshold approaching target={upstream_host} error_rate=0.22`,
      ],
      error: [
        `ERROR    app.http  Upstream timeout calling {upstream_host}: deadline exceeded request_id={request_id}`,
      ],
    },
    java: {
      warn: [
        `[{thread}] WARN  {app_pkg}.HttpClient - circuit breaker threshold approaching target={upstream_host} errorRate=0.22`,
      ],
      error: [
        `[{thread}] ERROR {app_pkg}.HttpClient - Downstream timeout calling {upstream_host}: deadline exceeded rid={request_id}`,
      ],
    },
  },

  stack_traces: {
    go: [
      `goroutine 1 [running]:
panic: runtime error: invalid memory address or nil pointer dereference
github.com/elastic/{app_snake}/internal/handler.(*Handler).ProcessRequest(0xc0003a4000)
\t/home/app/{app_snake}/internal/handler/handler.go:127 +0x3e5
github.com/elastic/{app_snake}/internal/service.(*Service).Handle(0xc0000b0000)
\t/home/app/{app_snake}/internal/service/service.go:84 +0x1c7
net/http.(*conn).serve(0xc0000d4000, {0xc000094000})
\t/usr/local/go/src/net/http/server.go:1991 +0x607`,
    ],

    python: [
      `Traceback (most recent call last):
  File "/usr/local/lib/python3.11/site-packages/flask/app.py", line 1484, in full_dispatch_request
    rv = self.dispatch_request()
  File "/app/{app_snake}/views/{app_snake}.py", line 58, in handle
    result = service.process(request.json)
  File "/app/{app_snake}/service/{app_snake}_service.py", line 112, in process
    record = self.repo.find(payload['id'])
AttributeError: 'NoneType' object has no attribute 'find'`,
    ],

    java: [
      `java.lang.NullPointerException: Cannot invoke "com.elastic.{app_snake}.domain.Record.getId()" because "record" is null
\tat com.elastic.{app_snake}.service.{app_pascal}Service.process({app_pascal}Service.java:87)
\tat com.elastic.{app_snake}.web.{app_pascal}Controller.handleRequest({app_pascal}Controller.java:38)
\tat org.springframework.web.servlet.FrameworkServlet.service(FrameworkServlet.java:898)
\tat java.base/java.lang.Thread.run(Thread.java:833)`,
    ],

    node: [
      `TypeError: Cannot read properties of null (reading 'id')
    at processRequest (/app/{app_snake}/src/handlers/{app_snake}.handler.js:72:24)
    at Layer.handle [as handle_request] (/app/{app_snake}/node_modules/express/lib/router/layer.js:95:5)
    at Route.dispatch (/app/{app_snake}/node_modules/express/lib/router/route.js:112:3)
    at processTicksAndRejections (node:internal/process/task_queues:96:5)`,
    ],
  },
};
