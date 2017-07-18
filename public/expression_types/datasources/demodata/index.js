import React from 'react';
import { Datasource } from '../../datasource';
import header from './header.png';

export const demodata = () => new Datasource('demodata', {
  displayName: 'Demo Data',
  image: header,
  template() { return (<div/>); },
});
