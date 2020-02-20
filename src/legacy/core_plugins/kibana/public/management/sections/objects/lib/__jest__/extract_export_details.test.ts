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

import { extractExportDetails, SavedObjectsExportResultDetails } from '../extract_export_details';

describe('extractExportDetails', () => {
  const objLine = (id: string, type: string) => {
    return JSON.stringify({ attributes: {}, id, references: [], type }) + '\n';
  };
  const detailsLine = (
    exported: number,
    missingRefs: SavedObjectsExportResultDetails['missingReferences'] = []
  ) => {
    return (
      JSON.stringify({
        exportedCount: exported,
        missingRefCount: missingRefs.length,
        missingReferences: missingRefs,
      }) + '\n'
    );
  };

  it('should extract the export details from the export blob', async () => {
    const exportData = new Blob(
      [
        [
          objLine('1', 'index-pattern'),
          objLine('2', 'index-pattern'),
          objLine('3', 'index-pattern'),
          detailsLine(3),
        ].join(''),
      ],
      { type: 'application/ndjson', endings: 'transparent' }
    );
    const result = await extractExportDetails(exportData);
    expect(result).not.toBeUndefined();
    expect(result).toEqual({
      exportedCount: 3,
      missingRefCount: 0,
      missingReferences: [],
    });
  });

  it('should properly extract the missing references', async () => {
    const exportData = new Blob(
      [
        [
          objLine('1', 'index-pattern'),
          detailsLine(1, [
            { id: '2', type: 'index-pattern' },
            { id: '3', type: 'index-pattern' },
          ]),
        ].join(''),
      ],
      {
        type: 'application/ndjson',
        endings: 'transparent',
      }
    );
    const result = await extractExportDetails(exportData);
    expect(result).not.toBeUndefined();
    expect(result).toEqual({
      exportedCount: 1,
      missingRefCount: 2,
      missingReferences: [
        { id: '2', type: 'index-pattern' },
        { id: '3', type: 'index-pattern' },
      ],
    });
  });

  it('should return undefined when the export does not contain details', async () => {
    const exportData = new Blob(
      [
        [
          objLine('1', 'index-pattern'),
          objLine('2', 'index-pattern'),
          objLine('3', 'index-pattern'),
        ].join(''),
      ],
      { type: 'application/ndjson', endings: 'transparent' }
    );
    const result = await extractExportDetails(exportData);
    expect(result).toBeUndefined();
  });
});
