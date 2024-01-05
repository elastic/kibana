/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import * as fs from 'fs';
import * as path from 'path';

const { mkdir, appendFile, writeFile, readdir, unlink, readFile } = fs.promises;

const DIR = '/tmp/kibana';
const ENTRY_DELIMITER = '\n\n';

export class Filesys {
  public async store(jsonObject: object, bucket: number) {
    const fileName = `${bucket}.json`;
    await this.appendToFile(fileName, jsonObject);
  }

  public async read<R extends object>(): Promise<R[]> {
    const files = await readdir(DIR);
    const filteredFiles = files
      .filter((file) => file.endsWith('.json'))
      .sort((a, b) => {
        const aTimestamp = parseInt(a.split('.')[0], 10);
        const bTimestamp = parseInt(b.split('.')[0], 10);
        return aTimestamp - bTimestamp;
      });
    const buckets: Record<string, R[]> = {};

    await Promise.all(
      filteredFiles.map(async (file) => {
        const bucket = file.split('.')[0];
        const filePath = `${DIR}/${file}`;
        const fileContent = await readFile(filePath, 'utf8');
        const fileContentArray = fileContent.trim().split(ENTRY_DELIMITER);
        buckets[bucket] = fileContentArray.map((action) => JSON.parse(action));
      })
    );

    const actions: R[] = [];

    Object.keys(buckets)
      .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
      .forEach((bucket) => {
        actions.push(...buckets[bucket]);
      });

    return actions;
  }

  public async clearUpTo(bucket: number) {
    const files = await readdir(DIR);
    const filesToDelete = files.filter((file) => {
      const fileTimestamp = parseInt(file.split('.')[0], 10);
      return fileTimestamp <= bucket;
    });

    const maxRetries = 3;
    let retries = 0;

    console.log('[TranslogService] Deleting files:', filesToDelete);

    const process = async (_filesToDelete: string[]) => {
      const failedFiles: Array<{ error: any; fileName: string }> = [];
      await Promise.all(
        _filesToDelete.map((file) =>
          unlink(path.join(DIR, file)).catch((e) => {
            failedFiles.push({ error: e, fileName: file });
          })
        )
      );
      if (failedFiles.length > 0 && retries < maxRetries) {
        retries++;
        await process(failedFiles.map((f) => f.fileName));
      }
    };

    await process(filesToDelete);
  }

  private async appendToFile(fileName: string, jsonObject: object) {
    const filePath = `${DIR}/${fileName}`;
    console.log('[TranslogService] Writing to file:', filePath);

    try {
      // Ensures that the directory exists. If the directory structure does not exist, it is created.
      await mkdir(path.dirname(filePath), { recursive: true });

      // Checks if the file exists
      const fileExists: boolean = fs.existsSync(filePath);

      // If the file exists, append the JSON object on a new line
      // If not, just write the JSON object
      const data: string = JSON.stringify(jsonObject) + ENTRY_DELIMITER;
      if (fileExists) {
        await appendFile(filePath, data);
      } else {
        await writeFile(filePath, data);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('An error occurred:', error);
    }
  }
}
