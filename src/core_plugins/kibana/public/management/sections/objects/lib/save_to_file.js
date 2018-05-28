import { saveAs } from '@elastic/filesaver';

export function saveToFile(resultsJson) {
  const blob = new Blob([resultsJson], { type: 'application/json' });
  saveAs(blob, 'export.json');
}
