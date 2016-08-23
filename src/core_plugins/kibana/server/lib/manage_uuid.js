import uuid from 'node-uuid';
import Promise from 'bluebird';
import { join as pathJoin } from 'path';
import { readFile as readFileCallback, writeFile as writeFileCallback } from 'fs';

const FILE_ENCODING = 'utf8';

export default async function manageUuid(server) {
  const config = server.config();
  const serverPort = server.info.port;
  const serverHostname = config.get('server.host');
  const fileName = `${serverHostname}:${serverPort}`;
  const uuidFile = pathJoin(config.get('path.data'), fileName);

  async function detectUuid() {
    const readFile = Promise.promisify(readFileCallback);
    try {
      const result = await readFile(uuidFile);
      return result.toString(FILE_ENCODING);
    } catch (e) {
      return false;
    }
  }

  async function writeUuid(uuid) {
    const writeFile = Promise.promisify(writeFileCallback);
    try {
      return await writeFile(uuidFile, uuid, { encoding: FILE_ENCODING });
    } catch (e) {
      return false;
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
