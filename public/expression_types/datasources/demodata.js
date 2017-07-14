import React from 'react';
import { Datasource } from '../datasource';

export const demodata = () => new Datasource('demodata', {
  displayName: 'Demo Data',
  template() { return (<div>Demodata has no conifgurable options</div>); },
});
