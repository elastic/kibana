import AdmZip from 'adm-zip';
import * as path from 'path';

export interface ParsedPlugin {
  info: any;
  files: Record<string, string>;
}

export async function parsePlugin(root: string, pluginContent: Buffer) {
  const zip = new AdmZip(pluginContent);
  const infoZip = zip.getEntry(path.join(root, 'kibana.json'));
  const info = JSON.parse(infoZip.getData().toString());
  // Load all of the TypeScript only files
  const files: { [s: string]: string } = {};
  
  zip.getEntries().filter(
    (entry) => !entry.isDirectory && (entry.entryName.endsWith('.js') || entry.entryName.endsWith('.json'))
  ).forEach((entry) => {
    const norm = path.normalize(entry.entryName);
    // Files which start with `.` are supposed to be hidden
    if (norm.startsWith('.')) {
      return;
    }
    const relativeToServer = path.relative(path.join(root, 'server'), norm);

    files[relativeToServer] = entry.getData().toString();
  });
  // console.log('files:', Object.keys(files))

  return {
    info,
    files,
  };
}
