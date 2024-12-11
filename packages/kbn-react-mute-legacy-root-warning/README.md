# @kbn/react-mute-legacy-root-warning

After we upgrade to React 18, we will see a warning in the console that we are using the legacy ReactDOM.render API.
This warning is expected as we will be in the process of migrating to the new createRoot API.
However, it is very noisy and we want to mute it for now.
