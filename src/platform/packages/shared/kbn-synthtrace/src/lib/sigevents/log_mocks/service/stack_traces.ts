/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Runtime } from '../../types';

export const STACK_TRACES: Partial<Record<Runtime, string[]>> = {
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
};
