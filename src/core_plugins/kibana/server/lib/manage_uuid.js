import uuid from 'uuid';
import Promise from 'bluebird';
import { join as pathJoin } from 'path';
import { readFile as readFileCallback, writeFile as writeFileCallback } from 'fs';

const FILE_ENCODING = 'utf8';

export default async function manageUuid(server) {
  const config = server.config();
  const fileName = 'uuid';
  const uuidFile = pathJoin(config.get('path.data'), fileName);

  async function detectUuid() {
    const readFile = Promise.promisify(readFileCallback);
    try {
      const result = await readFile(uuidFile);
      return result.toString(FILE_ENCODING);
    } catch (err) {
      if (err.code === 'ENOENT') {
        // non-existant uuid file is ok
        return false;
      }
      server.log(['error', 'read-uuid'], err);
      // Note: this will most likely be logged as an Unhandled Rejection
      throw err;
    }
  }

  async function writeUuid(uuid) {
    const writeFile = Promise.promisify(writeFileCallback);
    try {
      return await writeFile(uuidFile, uuid, { encoding: FILE_ENCODING });
    } catch (err) {
      server.log(['error', 'write-uuid'], err);
      // Note: this will most likely be logged as an Unhandled Rejection
      throw err;
    }
  }

  // detect if uuid exists already from before a restart
  const logToServer = (msg) => server.log(['server', 'uuid', fileName], msg);
  const dataFileUuid = await detectUuid();
  let serverConfigUuid = config.get('server.uuid'); // check if already set in config

  if (dataFileUuid) {
    // data uuid found
    if (serverConfigUuid === dataFileUuid) {
      // config uuid exists, data uuid exists and matches
      logToServer(`Kibana instance UUID: ${dataFileUuid}`);
      return;
    }

    if (!serverConfigUuid) {
      // config uuid missing, data uuid exists
      serverConfigUuid = dataFileUuid;
      logToServer(`Resuming persistent Kibana instance UUID: ${serverConfigUuid}`);
      config.set('server.uuid', serverConfigUuid);
      return;
    }

    if (serverConfigUuid !== dataFileUuid) {
      // config uuid exists, data uuid exists but mismatches
      logToServer(`Updating Kibana instance UUID to: ${serverConfigUuid} (was: ${dataFileUuid})`);
      return writeUuid(serverConfigUuid);
    }
  }

  // data uuid missing

  if (!serverConfigUuid) {
    // config uuid missing
    serverConfigUuid = uuid.v4();
    config.set('server.uuid', serverConfigUuid);
  }

  logToServer(`Setting new Kibana instance UUID: ${serverConfigUuid}`);
  return writeUuid(serverConfigUuid);
}
