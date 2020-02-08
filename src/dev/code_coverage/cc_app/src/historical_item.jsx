import React from "react";

export default function HistoricalItem({item}) {

  return (
    <div>
      <a
        className="App-link"
        href={href(item)}
        target="_blank"
        rel="noopener noreferrer"
      >
        {item}
      </a>
    </div>
  );
}

function href(x) {
  return ['https://console.cloud.google.com/storage/browser/', trim(x)]
    .join('');
}

function trim(x) {
  return x.replace('gs://', '');
}
