import React from 'react';

export const HomeView = () => (
  <div className="guideContentPage guideHomePage">
    <div className="guideContentPage__content">
      <div style={{ marginBottom: 40, backgroundColor: '#ffec9d', padding: 20 }}>
        <h1 className="guideTitle">
          The Kibana UI Framework has been DEPRECATED.
        </h1>

        <h2 className="guideTitle">
          Please use the <a href="https://github.com/elastic/eui">EUI Framework instead</a>.
        </h2>
      </div>
    </div>
  </div>
);
