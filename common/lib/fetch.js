import axios from 'axios';
import { FETCH_TIMEOUT } from './constants';

export const fetch = axios.create({
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'kbn-xsrf': 'professionally-crafted-string-of-text',
  },
  timeout: FETCH_TIMEOUT,
});
