/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { truncateByHeight } from './truncate_by_height';

describe('truncateByHeight', () => {
  it('renders input without any formatting or escaping', () => {
    expect(
      truncateByHeight({
        body:
          '<span> <pre> hey you can put HTML & stuff in here </pre> <button onClick="alert(1)">button!</button> </span>',
      })
    ).toMatchInlineSnapshot(
      `"<div class=\\"truncate-by-height\\"><span> <pre> hey you can put HTML & stuff in here </pre> <button onClick=\\"alert(1)\\">button!</button> </span></div>"`
    );
  });
});
