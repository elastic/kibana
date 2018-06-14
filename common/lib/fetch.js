import axios from 'axios';

export const fetch = axios.create({
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'kbn-xsrf': 'professionally-crafted-string-of-text',
  },
});
