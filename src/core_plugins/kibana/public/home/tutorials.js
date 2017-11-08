import _ from 'lodash';
import axios from 'axios';
import chrome from 'ui/chrome';

const baseUrl = chrome.addBasePath('/api/kibana/home/tutorials');

const axiosInstance = axios.create({
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'kbn-xsrf': 'kibana',
  },
});

let tutorials;

async function loadTutorials() {
  const response = await axiosInstance.get(baseUrl);
  tutorials = response.data;
}

export async function getTutorials() {
  if (!tutorials) {
    await loadTutorials();
  }

  return _.cloneDeep(tutorials);
}

export async function getTutorial(id) {
  if (!tutorials) {
    await loadTutorials();
  }

  const tutorial = tutorials.find(tutorial => {
    return tutorial.id === id;
  });

  if (tutorial) {
    return _.cloneDeep(tutorial);
  }
}
