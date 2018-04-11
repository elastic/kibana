import React from 'react';
import { templateFromReactComponent } from '../../../lib/template_from_react_component';
import header from './header.png';

const DemodataDatasource = () => (
  <div>
    <h3>The demodata source</h3>
    <p>
      This data source is connected to every Canvas element by default. Its purpose is to give you
      lightweight data to use in getting to know an element. The demo data set contains 4 strings, 3
      numbers and a date. Feel free to experiment and, when you're ready, click the
      <i>Change Datasource</i> link below to connect to your own data.
    </p>
  </div>
);

export const demodata = () => ({
  name: 'demodata',
  displayName: 'Demo Data',
  help: 'Mock data set with with usernames, prices, projects, countries and phases.',
  image: header,
  template: templateFromReactComponent(DemodataDatasource),
});
