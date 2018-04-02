import { get } from 'lodash';
import { documentationLinks } from './documentation_links';

export const getDocLink = id => get(documentationLinks, id);
