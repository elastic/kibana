/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fsp from 'fs/promises';
import Path from 'path';
import { ToolingLog } from '@kbn/tooling-log';
import { trimDeletedDocsFromNav } from './trim_deleted_docs_from_nav';

// Mock fs/promises
jest.mock('fs/promises');

// Mock getAllDocFileIds
jest.mock('./mdx/get_all_doc_file_ids', () => ({
  getAllDocFileIds: jest.fn(() => Promise.resolve(['doc1', 'doc2', 'doc3'])),
}));

const log = new ToolingLog({
  level: 'silent',
  writeTo: process.stdout,
});

describe('trimDeletedDocsFromNav', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('removes deleted doc IDs from nav', async () => {
    const initialDocIds = ['doc1', 'doc2', 'doc3', 'doc4', 'doc5'];
    const outputDir = Path.resolve(__dirname, 'test_output');

    const mockNav = {
      items: [
        { id: 'doc1', title: 'Doc 1' },
        { id: 'doc2', title: 'Doc 2' },
        {
          id: 'parent',
          items: [
            { id: 'doc3', title: 'Doc 3' },
            { id: 'doc4', title: 'Doc 4' }, // This should be removed
            { id: 'doc5', title: 'Doc 5' }, // This should be removed
          ],
        },
      ],
    };

    (Fsp.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockNav));
    (Fsp.writeFile as jest.Mock).mockResolvedValue(undefined);

    await trimDeletedDocsFromNav(log, initialDocIds, outputDir);

    // Should have called writeFile to update nav
    expect(Fsp.writeFile).toHaveBeenCalled();
    const writeCall = (Fsp.writeFile as jest.Mock).mock.calls[0];
    const updatedNav = JSON.parse(writeCall[1]);

    // doc4 and doc5 should be removed
    const parentItem = updatedNav.items.find((item: any) => item.id === 'parent');
    expect(parentItem).toBeDefined();
    expect(parentItem.items).toHaveLength(1);
    expect(parentItem.items[0].id).toBe('doc3');
  });

  it('does not update nav when no docs are deleted', async () => {
    const initialDocIds = ['doc1', 'doc2', 'doc3'];
    const outputDir = Path.resolve(__dirname, 'test_output');

    const mockNav = {
      items: [
        { id: 'doc1', title: 'Doc 1' },
        { id: 'doc2', title: 'Doc 2' },
        { id: 'doc3', title: 'Doc 3' },
      ],
    };

    (Fsp.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockNav));

    await trimDeletedDocsFromNav(log, initialDocIds, outputDir);

    // Should not call writeFile when no docs are deleted
    expect(Fsp.writeFile).not.toHaveBeenCalled();
  });

  it('handles nav file read errors', async () => {
    const initialDocIds = ['doc1'];
    const outputDir = Path.resolve(__dirname, 'test_output');

    (Fsp.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));

    await expect(trimDeletedDocsFromNav(log, initialDocIds, outputDir)).rejects.toThrow(
      'unable to read dev-docs nav'
    );
  });

  it('handles invalid JSON in nav file', async () => {
    const initialDocIds = ['doc1'];
    const outputDir = Path.resolve(__dirname, 'test_output');

    (Fsp.readFile as jest.Mock).mockResolvedValue('invalid json {');

    await expect(trimDeletedDocsFromNav(log, initialDocIds, outputDir)).rejects.toThrow(
      'unable to parse nav'
    );
  });

  it('preserves newline at end of nav file', async () => {
    const initialDocIds = ['doc1', 'doc2', 'doc3', 'doc4'];
    const outputDir = Path.resolve(__dirname, 'test_output');

    const mockNav = {
      items: [
        { id: 'doc1' },
        { id: 'doc4' }, // Should be removed
      ],
    };

    (Fsp.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockNav) + '\n');
    (Fsp.writeFile as jest.Mock).mockResolvedValue(undefined);

    await trimDeletedDocsFromNav(log, initialDocIds, outputDir);

    expect(Fsp.writeFile).toHaveBeenCalled();
    const writeCall = (Fsp.writeFile as jest.Mock).mock.calls[0];
    expect(writeCall[1].endsWith('\n')).toBe(true);
  });

  it('handles nested nav structures', async () => {
    const initialDocIds = ['doc1', 'doc2', 'doc3', 'doc4'];
    const outputDir = Path.resolve(__dirname, 'test_output');

    const mockNav = {
      items: [
        {
          id: 'level1',
          items: [
            {
              id: 'level2',
              items: [
                { id: 'doc1' },
                { id: 'doc4' }, // Should be removed
              ],
            },
          ],
        },
      ],
    };

    (Fsp.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockNav));
    (Fsp.writeFile as jest.Mock).mockResolvedValue(undefined);

    await trimDeletedDocsFromNav(log, initialDocIds, outputDir);

    expect(Fsp.writeFile).toHaveBeenCalled();
    const writeCall = (Fsp.writeFile as jest.Mock).mock.calls[0];
    const updatedNav = JSON.parse(writeCall[1]);

    // doc4 should be removed from nested structure
    expect(updatedNav.items[0].items[0].items).toHaveLength(1);
    expect(updatedNav.items[0].items[0].items[0].id).toBe('doc1');
  });
});
