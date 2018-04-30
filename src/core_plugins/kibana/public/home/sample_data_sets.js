import chrome from 'ui/chrome';
import { notify } from 'ui/notify';

const sampleDataUrl = chrome.addBasePath('/api/sample_data');
const headers = new Headers();
headers.append('Accept', 'application/json');
headers.append('Content-Type', 'application/json');
headers.append('kbn-xsrf', 'kibana');

export async function listSampleDataSets() {
  try {
    const response = await fetch(sampleDataUrl, {
      method: 'get',
      credentials: 'include',
      headers: headers,
    });
    if (response.status >= 300) {
      throw new Error(`Request failed with status code: ${response.status}`);
    }

    return await response.json();
  } catch(err) {
    notify.error(`Unable to load sample data sets, ${err}`);
    return [];
  }
}

export async function installSampleDataSet(id) {
  try {
    const response = await fetch(`${sampleDataUrl}/${id}`, {
      method: 'post',
      credentials: 'include',
      headers: headers,
    });
    if (response.status >= 300) {
      throw new Error(`Request failed with status code: ${response.status}`);
    }
  } catch(err) {
    notify.error(`Unable to install sample data set, ${err}`);
  }
}

export async function uninstallSampleDataSet(id) {
  try {
    const response = await fetch(`${sampleDataUrl}/${id}`, {
      method: 'delete',
      credentials: 'include',
      headers: headers,
    });
    if (response.status >= 300) {
      throw new Error(`Request failed with status code: ${response.status}`);
    }
  } catch(err) {
    notify.error(`Unable to uninstall sample data set, ${err}`);
  }
}
