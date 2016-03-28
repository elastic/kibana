/*jshint esnext:true*/

import test from './import.js';

class App {
  constructor(arg='test') {
    this.result = arg + test;
  }
}

export default App;
