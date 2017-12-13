import _ from 'lodash';
import chrome from 'ui/chrome';
import { notify } from 'ui/notify';

const baseUrl = chrome.addBasePath('/api/kibana/home/tutorials');
const headers = new Headers();
headers.append('Accept', 'application/json');
headers.append('Content-Type', 'application/json');
headers.append('kbn-xsrf', 'kibana');

let tutorials = [];
let turorialsLoaded = false;

async function loadTutorials() {
  try {
    const response = await fetch(baseUrl, {
      method: 'get',
      credentials: 'include',
      headers: headers,
    });
    if (response.status >= 300) {
      throw new Error(`Request failed with status code: ${response.status}`);
    }

    tutorials = await response.json();
    turorialsLoaded = true;
  } catch(err) {
    notify.error(`Unable to load tutorials, ${err}`);
  }
}

export async function getTutorials() {
  if (!turorialsLoaded) {
    await loadTutorials();
  }

  return _.cloneDeep(tutorials);
}

export async function getTutorial(id) {
  if (!turorialsLoaded) {
    await loadTutorials();
  }

  const tutorial = tutorials.find(tutorial => {
    return tutorial.id === id;
  });

  if (tutorial) {
    return _.cloneDeep(tutorial);
  }
}
