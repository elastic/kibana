import { EuiPageSection } from '@elastic/eui';
import React from 'react';
import './App.css';
import Header from './header';
function App() {
  return (
    <div className="App">
      <Header />
      <EuiPageSection restrictWidth={false} color="subdued" bottomBorder={true}>
        Synthtrace UI is under construction.
      </EuiPageSection>
    </div>
  );
}

export default App;
