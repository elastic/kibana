/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import express from 'express';

import { main, getBuildkiteClient } from './release_events';

const app = express();

app.use(express.urlencoded({ extended: true }));

const makeHtml = (body: string) => `<html><body>
${body}
<form action="/command" method="post">
  <input type="text" name="command" />
  <input type="submit" value="Submit" />
</body></html>`;

app.get('/', (req, res) => {
  res.send(makeHtml('empty'));
  res.end();
});

app.post('/command', (req, res) => {
  const command = req.body.command;
  main(command.split(' '))
    .then(() => {
      // @ts-ignore
      const calls = getBuildkiteClient().exec.calls;
      const annotations = calls.filter((call: any) =>
        call.command.startsWith('buildkite-agent annotate')
      );

      const sections: Record<string, string> = {};
      annotations.forEach((annotation: { command: string; opts: { input?: string } }) => {
        console.log(annotation.command);
        const match = annotation.command.match(
          /buildkite-agent annotate --context '([a-z-]+)' --style '([a-z]+)'\s?(.*)?/
        )!;
        const [_, sectionName, style, content] = match;
        const html = annotation.opts.input || content || '<missing content>';

        sections[sectionName] = `<div style="${style}">${html}</div>`;
      });

      res.send(makeHtml(Object.values(sections).join('\n')));
      res.end();
    })
    .catch((e) => {
      res.send(makeHtml(e.message));
      res.end();
    });
});

app.listen(3000, () => {
  console.log('Server listening on port 3000');
});
