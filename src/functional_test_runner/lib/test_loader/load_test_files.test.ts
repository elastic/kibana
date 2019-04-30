/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { resolve } from 'path';

import { ToolingLog } from '@kbn/dev-utils';

import { ProviderCollection } from '../providers';
import { loadTestFiles } from './load_test_files';

const log = new ToolingLog();
const providers = new ProviderCollection(log, []);

it('properly collects tests', () => {
  expect(
    loadTestFiles({
      testFiles: [resolve(__dirname, '__fixtures__/tests.js')],
      providers,
      log,
    })
  ).toMatchInlineSnapshot(`
Suite {
  "excludedTasks": Array [],
  "exclusive": false,
  "hooks": Array [
    Hook {
      "fn": [MockFunction root level before hook],
      "name": undefined,
      "type": "before",
    },
    Hook {
      "fn": [MockFunction root level after hook],
      "name": undefined,
      "type": "after",
    },
  ],
  "name": undefined,
  "parent": undefined,
  "skip": false,
  "tags": Array [],
  "tasks": Array [
    Suite {
      "excludedTasks": Array [],
      "exclusive": false,
      "hooks": Array [
        Hook {
          "fn": [MockFunction hook1],
          "name": undefined,
          "type": "beforeEach",
        },
        Hook {
          "fn": [MockFunction hook2],
          "name": "foo+bar",
          "type": "before",
        },
        Hook {
          "fn": [MockFunction after hook],
          "name": undefined,
          "type": "after",
        },
      ],
      "name": "foo",
      "parent": [Circular],
      "skip": false,
      "tags": Array [
        "foo",
      ],
      "tasks": Array [
        Test {
          "exclusive": false,
          "fn": [MockFunction test1],
          "name": "bar",
          "parent": [Circular],
          "skip": false,
          "tags": Array [],
        },
        Suite {
          "excludedTasks": Array [],
          "exclusive": false,
          "hooks": Array [
            Hook {
              "fn": [MockFunction hook3],
              "name": "boxen",
              "type": "afterEach",
            },
          ],
          "name": "baz",
          "parent": [Circular],
          "skip": false,
          "tags": Array [
            "b",
            "a",
            "r",
            "bar",
          ],
          "tasks": Array [
            Test {
              "exclusive": false,
              "fn": [MockFunction test2],
              "name": "box",
              "parent": [Circular],
              "skip": false,
              "tags": Array [],
            },
            Test {
              "exclusive": false,
              "fn": [MockFunction test3],
              "name": "box2",
              "parent": [Circular],
              "skip": false,
              "tags": Array [],
            },
          ],
        },
        Test {
          "exclusive": false,
          "fn": [MockFunction test4],
          "name": "bbar",
          "parent": [Circular],
          "skip": false,
          "tags": Array [
            "b",
          ],
        },
      ],
    },
  ],
}
`);
});

it('removes non-exclusive tests when a .only is in use', () => {
  expect(
    loadTestFiles({
      testFiles: [resolve(__dirname, '__fixtures__/exclusive.js')],
      providers,
      log,
    })
  ).toMatchInlineSnapshot(`
Suite {
  "excludedTasks": Array [
    Test {
      "exclusive": false,
      "fn": [MockFunction skip this test],
      "name": "skips this test",
      "parent": [Circular],
      "skip": false,
      "tags": Array [],
    },
  ],
  "exclusive": false,
  "hooks": Array [
    Hook {
      "fn": [MockFunction root level before hook],
      "name": undefined,
      "type": "before",
    },
    Hook {
      "fn": [MockFunction root level after hook],
      "name": undefined,
      "type": "after",
    },
  ],
  "name": undefined,
  "parent": undefined,
  "skip": false,
  "tags": Array [],
  "tasks": Array [
    Suite {
      "excludedTasks": Array [
        Test {
          "exclusive": false,
          "fn": [MockFunction should be ignored],
          "name": "boom",
          "parent": [Circular],
          "skip": false,
          "tags": Array [],
        },
      ],
      "exclusive": false,
      "hooks": Array [
        Hook {
          "fn": [MockFunction beforeEach],
          "name": undefined,
          "type": "beforeEach",
        },
        Hook {
          "fn": [MockFunction afterEach],
          "name": undefined,
          "type": "afterEach",
        },
      ],
      "name": "foo",
      "parent": [Circular],
      "skip": false,
      "tags": Array [
        "foo",
      ],
      "tasks": Array [
        Test {
          "exclusive": true,
          "fn": [MockFunction barTest],
          "name": "bar",
          "parent": [Circular],
          "skip": false,
          "tags": Array [],
        },
        Suite {
          "excludedTasks": Array [],
          "exclusive": true,
          "hooks": Array [
            Hook {
              "fn": [MockFunction after boxTest in baz],
              "name": undefined,
              "type": "after",
            },
          ],
          "name": "baz",
          "parent": [Circular],
          "skip": false,
          "tags": Array [
            "foo2",
          ],
          "tasks": Array [
            Test {
              "exclusive": false,
              "fn": [MockFunction boxTest in baz],
              "name": "box",
              "parent": [Circular],
              "skip": false,
              "tags": Array [],
            },
          ],
        },
        Test {
          "exclusive": true,
          "fn": [MockFunction bar2Test],
          "name": "bar2",
          "parent": [Circular],
          "skip": false,
          "tags": Array [],
        },
      ],
    },
    Test {
      "exclusive": true,
      "fn": [MockFunction include this test],
      "name": "includes this test",
      "parent": [Circular],
      "skip": false,
      "tags": Array [],
    },
  ],
}
`);
});

it(`excludes any test that isn't tagged with includeTags`, () => {
  expect(
    loadTestFiles({
      testFiles: [resolve(__dirname, '__fixtures__/tests.js')],
      providers,
      log,
      includeTags: ['b'],
    })
  ).toMatchInlineSnapshot(`
Suite {
  "excludedTasks": Array [],
  "exclusive": false,
  "hooks": Array [
    Hook {
      "fn": [MockFunction root level before hook],
      "name": undefined,
      "type": "before",
    },
    Hook {
      "fn": [MockFunction root level after hook],
      "name": undefined,
      "type": "after",
    },
  ],
  "name": undefined,
  "parent": undefined,
  "skip": false,
  "tags": Array [],
  "tasks": Array [
    Suite {
      "excludedTasks": Array [
        Test {
          "exclusive": false,
          "fn": [MockFunction test1],
          "name": "bar",
          "parent": [Circular],
          "skip": false,
          "tags": Array [],
        },
      ],
      "exclusive": false,
      "hooks": Array [
        Hook {
          "fn": [MockFunction hook1],
          "name": undefined,
          "type": "beforeEach",
        },
        Hook {
          "fn": [MockFunction hook2],
          "name": "foo+bar",
          "type": "before",
        },
        Hook {
          "fn": [MockFunction after hook],
          "name": undefined,
          "type": "after",
        },
      ],
      "name": "foo",
      "parent": [Circular],
      "skip": false,
      "tags": Array [
        "foo",
      ],
      "tasks": Array [
        Suite {
          "excludedTasks": Array [],
          "exclusive": false,
          "hooks": Array [
            Hook {
              "fn": [MockFunction hook3],
              "name": "boxen",
              "type": "afterEach",
            },
          ],
          "name": "baz",
          "parent": [Circular],
          "skip": false,
          "tags": Array [
            "b",
            "a",
            "r",
            "bar",
          ],
          "tasks": Array [
            Test {
              "exclusive": false,
              "fn": [MockFunction test2],
              "name": "box",
              "parent": [Circular],
              "skip": false,
              "tags": Array [],
            },
            Test {
              "exclusive": false,
              "fn": [MockFunction test3],
              "name": "box2",
              "parent": [Circular],
              "skip": false,
              "tags": Array [],
            },
          ],
        },
        Test {
          "exclusive": false,
          "fn": [MockFunction test4],
          "name": "bbar",
          "parent": [Circular],
          "skip": false,
          "tags": Array [
            "b",
          ],
        },
      ],
    },
  ],
}
`);
});

it(`excludes any test tagged with excludeTags`, () => {
  expect(
    loadTestFiles({
      testFiles: [resolve(__dirname, '__fixtures__/tests.js')],
      providers,
      log,
      excludeTags: ['b'],
    })
  ).toMatchInlineSnapshot(`
Suite {
  "excludedTasks": Array [],
  "exclusive": false,
  "hooks": Array [
    Hook {
      "fn": [MockFunction root level before hook],
      "name": undefined,
      "type": "before",
    },
    Hook {
      "fn": [MockFunction root level after hook],
      "name": undefined,
      "type": "after",
    },
  ],
  "name": undefined,
  "parent": undefined,
  "skip": false,
  "tags": Array [],
  "tasks": Array [
    Suite {
      "excludedTasks": Array [
        Suite {
          "excludedTasks": Array [],
          "exclusive": false,
          "hooks": Array [
            Hook {
              "fn": [MockFunction hook3],
              "name": "boxen",
              "type": "afterEach",
            },
          ],
          "name": "baz",
          "parent": [Circular],
          "skip": false,
          "tags": Array [
            "b",
            "a",
            "r",
            "bar",
          ],
          "tasks": Array [
            Test {
              "exclusive": false,
              "fn": [MockFunction test2],
              "name": "box",
              "parent": [Circular],
              "skip": false,
              "tags": Array [],
            },
            Test {
              "exclusive": false,
              "fn": [MockFunction test3],
              "name": "box2",
              "parent": [Circular],
              "skip": false,
              "tags": Array [],
            },
          ],
        },
        Test {
          "exclusive": false,
          "fn": [MockFunction test4],
          "name": "bbar",
          "parent": [Circular],
          "skip": false,
          "tags": Array [
            "b",
          ],
        },
      ],
      "exclusive": false,
      "hooks": Array [
        Hook {
          "fn": [MockFunction hook1],
          "name": undefined,
          "type": "beforeEach",
        },
        Hook {
          "fn": [MockFunction hook2],
          "name": "foo+bar",
          "type": "before",
        },
        Hook {
          "fn": [MockFunction after hook],
          "name": undefined,
          "type": "after",
        },
      ],
      "name": "foo",
      "parent": [Circular],
      "skip": false,
      "tags": Array [
        "foo",
      ],
      "tasks": Array [
        Test {
          "exclusive": false,
          "fn": [MockFunction test1],
          "name": "bar",
          "parent": [Circular],
          "skip": false,
          "tags": Array [],
        },
      ],
    },
  ],
}
`);
});

it(`filters out tests without grep in there name somewhere`, () => {
  expect(
    loadTestFiles({
      testFiles: [resolve(__dirname, '__fixtures__/tests.js')],
      providers,
      log,
      grep: 'baz',
    })
  ).toMatchInlineSnapshot(`
Suite {
  "excludedTasks": Array [],
  "exclusive": false,
  "hooks": Array [
    Hook {
      "fn": [MockFunction root level before hook],
      "name": undefined,
      "type": "before",
    },
    Hook {
      "fn": [MockFunction root level after hook],
      "name": undefined,
      "type": "after",
    },
  ],
  "name": undefined,
  "parent": undefined,
  "skip": false,
  "tags": Array [],
  "tasks": Array [
    Suite {
      "excludedTasks": Array [
        Test {
          "exclusive": false,
          "fn": [MockFunction test1],
          "name": "bar",
          "parent": [Circular],
          "skip": false,
          "tags": Array [],
        },
        Test {
          "exclusive": false,
          "fn": [MockFunction test4],
          "name": "bbar",
          "parent": [Circular],
          "skip": false,
          "tags": Array [
            "b",
          ],
        },
      ],
      "exclusive": false,
      "hooks": Array [
        Hook {
          "fn": [MockFunction hook1],
          "name": undefined,
          "type": "beforeEach",
        },
        Hook {
          "fn": [MockFunction hook2],
          "name": "foo+bar",
          "type": "before",
        },
        Hook {
          "fn": [MockFunction after hook],
          "name": undefined,
          "type": "after",
        },
      ],
      "name": "foo",
      "parent": [Circular],
      "skip": false,
      "tags": Array [
        "foo",
      ],
      "tasks": Array [
        Suite {
          "excludedTasks": Array [],
          "exclusive": false,
          "hooks": Array [
            Hook {
              "fn": [MockFunction hook3],
              "name": "boxen",
              "type": "afterEach",
            },
          ],
          "name": "baz",
          "parent": [Circular],
          "skip": false,
          "tags": Array [
            "b",
            "a",
            "r",
            "bar",
          ],
          "tasks": Array [
            Test {
              "exclusive": false,
              "fn": [MockFunction test2],
              "name": "box",
              "parent": [Circular],
              "skip": false,
              "tags": Array [],
            },
            Test {
              "exclusive": false,
              "fn": [MockFunction test3],
              "name": "box2",
              "parent": [Circular],
              "skip": false,
              "tags": Array [],
            },
          ],
        },
      ],
    },
  ],
}
`);
});

it(`inverts the grep pattern`, () => {
  expect(
    loadTestFiles({
      testFiles: [resolve(__dirname, '__fixtures__/tests.js')],
      providers,
      log,
      grep: 'baz',
      invertGrep: true,
    })
  ).toMatchInlineSnapshot(`
Suite {
  "excludedTasks": Array [],
  "exclusive": false,
  "hooks": Array [
    Hook {
      "fn": [MockFunction root level before hook],
      "name": undefined,
      "type": "before",
    },
    Hook {
      "fn": [MockFunction root level after hook],
      "name": undefined,
      "type": "after",
    },
  ],
  "name": undefined,
  "parent": undefined,
  "skip": false,
  "tags": Array [],
  "tasks": Array [
    Suite {
      "excludedTasks": Array [],
      "exclusive": false,
      "hooks": Array [
        Hook {
          "fn": [MockFunction hook1],
          "name": undefined,
          "type": "beforeEach",
        },
        Hook {
          "fn": [MockFunction hook2],
          "name": "foo+bar",
          "type": "before",
        },
        Hook {
          "fn": [MockFunction after hook],
          "name": undefined,
          "type": "after",
        },
      ],
      "name": "foo",
      "parent": [Circular],
      "skip": false,
      "tags": Array [
        "foo",
      ],
      "tasks": Array [
        Test {
          "exclusive": false,
          "fn": [MockFunction test1],
          "name": "bar",
          "parent": [Circular],
          "skip": false,
          "tags": Array [],
        },
        Test {
          "exclusive": false,
          "fn": [MockFunction test4],
          "name": "bbar",
          "parent": [Circular],
          "skip": false,
          "tags": Array [
            "b",
          ],
        },
      ],
    },
  ],
}
`);
});

it(`trims empty suites`, () => {
  expect(
    loadTestFiles({
      testFiles: [resolve(__dirname, '__fixtures__/tests.js')],
      providers,
      log,
      excludeTags: ['b'],
    })
  ).toMatchInlineSnapshot(`
Suite {
  "excludedTasks": Array [],
  "exclusive": false,
  "hooks": Array [
    Hook {
      "fn": [MockFunction root level before hook],
      "name": undefined,
      "type": "before",
    },
    Hook {
      "fn": [MockFunction root level after hook],
      "name": undefined,
      "type": "after",
    },
  ],
  "name": undefined,
  "parent": undefined,
  "skip": false,
  "tags": Array [],
  "tasks": Array [
    Suite {
      "excludedTasks": Array [
        Suite {
          "excludedTasks": Array [],
          "exclusive": false,
          "hooks": Array [
            Hook {
              "fn": [MockFunction hook3],
              "name": "boxen",
              "type": "afterEach",
            },
          ],
          "name": "baz",
          "parent": [Circular],
          "skip": false,
          "tags": Array [
            "b",
            "a",
            "r",
            "bar",
          ],
          "tasks": Array [
            Test {
              "exclusive": false,
              "fn": [MockFunction test2],
              "name": "box",
              "parent": [Circular],
              "skip": false,
              "tags": Array [],
            },
            Test {
              "exclusive": false,
              "fn": [MockFunction test3],
              "name": "box2",
              "parent": [Circular],
              "skip": false,
              "tags": Array [],
            },
          ],
        },
        Test {
          "exclusive": false,
          "fn": [MockFunction test4],
          "name": "bbar",
          "parent": [Circular],
          "skip": false,
          "tags": Array [
            "b",
          ],
        },
      ],
      "exclusive": false,
      "hooks": Array [
        Hook {
          "fn": [MockFunction hook1],
          "name": undefined,
          "type": "beforeEach",
        },
        Hook {
          "fn": [MockFunction hook2],
          "name": "foo+bar",
          "type": "before",
        },
        Hook {
          "fn": [MockFunction after hook],
          "name": undefined,
          "type": "after",
        },
      ],
      "name": "foo",
      "parent": [Circular],
      "skip": false,
      "tags": Array [
        "foo",
      ],
      "tasks": Array [
        Test {
          "exclusive": false,
          "fn": [MockFunction test1],
          "name": "bar",
          "parent": [Circular],
          "skip": false,
          "tags": Array [],
        },
      ],
    },
  ],
}
`);
});

it(`returns nothing when all tests are excluded`, () => {
  expect(
    loadTestFiles({
      testFiles: [resolve(__dirname, '__fixtures__/tests.js')],
      providers,
      log,
      includeTags: ['12345'],
    })
  ).toMatchInlineSnapshot(`
Suite {
  "excludedTasks": Array [
    Suite {
      "excludedTasks": Array [
        Test {
          "exclusive": false,
          "fn": [MockFunction test1],
          "name": "bar",
          "parent": [Circular],
          "skip": false,
          "tags": Array [],
        },
        Suite {
          "excludedTasks": Array [
            Test {
              "exclusive": false,
              "fn": [MockFunction test2],
              "name": "box",
              "parent": [Circular],
              "skip": false,
              "tags": Array [],
            },
            Test {
              "exclusive": false,
              "fn": [MockFunction test3],
              "name": "box2",
              "parent": [Circular],
              "skip": false,
              "tags": Array [],
            },
          ],
          "exclusive": false,
          "hooks": Array [
            Hook {
              "fn": [MockFunction hook3],
              "name": "boxen",
              "type": "afterEach",
            },
          ],
          "name": "baz",
          "parent": [Circular],
          "skip": false,
          "tags": Array [
            "b",
            "a",
            "r",
            "bar",
          ],
          "tasks": Array [],
        },
        Test {
          "exclusive": false,
          "fn": [MockFunction test4],
          "name": "bbar",
          "parent": [Circular],
          "skip": false,
          "tags": Array [
            "b",
          ],
        },
      ],
      "exclusive": false,
      "hooks": Array [
        Hook {
          "fn": [MockFunction hook1],
          "name": undefined,
          "type": "beforeEach",
        },
        Hook {
          "fn": [MockFunction hook2],
          "name": "foo+bar",
          "type": "before",
        },
        Hook {
          "fn": [MockFunction after hook],
          "name": undefined,
          "type": "after",
        },
      ],
      "name": "foo",
      "parent": [Circular],
      "skip": false,
      "tags": Array [
        "foo",
      ],
      "tasks": Array [],
    },
  ],
  "exclusive": false,
  "hooks": Array [
    Hook {
      "fn": [MockFunction root level before hook],
      "name": undefined,
      "type": "before",
    },
    Hook {
      "fn": [MockFunction root level after hook],
      "name": undefined,
      "type": "after",
    },
  ],
  "name": undefined,
  "parent": undefined,
  "skip": false,
  "tags": Array [],
  "tasks": Array [],
}
`);
});
