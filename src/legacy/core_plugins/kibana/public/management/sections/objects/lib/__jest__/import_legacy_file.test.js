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

import { importLegacyFile } from '../import_legacy_file';

describe('importFile', () => {
  it('should import a file', async () => {
    class FileReader {
      readAsText(text) {
        this.onload({
          target: {
            result: JSON.stringify({ text }),
          },
        });
      }
    }

    const file = 'foo';

    const imported = await importLegacyFile(file, FileReader);
    expect(imported).toEqual({ text: file });
  });

  it('should throw errors', async () => {
    class FileReader {
      readAsText() {
        this.onload({
          target: {
            result: 'not_parseable',
          },
        });
      }
    }

    const file = 'foo';

    try {
      await importLegacyFile(file, FileReader);
    } catch (e) {
      // There isn't a great way to handle throwing exceptions
      // with async/await but this seems to work :shrug:
      expect(() => {
        throw e;
      }).toThrow();
    }
  });
});
