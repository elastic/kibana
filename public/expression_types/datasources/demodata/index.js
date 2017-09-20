import React from 'react';
import { Datasource } from '../../datasource';
import header from './header.png';

export const demodata = () => new Datasource('demodata', {
  displayName: 'Demo Data',
  image: header,
  template() { return (
    <div>
      <h3>The demodata source</h3>
      <p>
        This data source is connected to every Canvas element by default. Its purpose is to give you lightweight data to
        use in getting to know an element. The demo data set contains 4 strings, 3 numbers and a date. Feel free to
        experiment and, when you're ready, click the <i>Change Datasource</i> link above to connect to your own data.
      </p>
    </div>
  ); },
});
