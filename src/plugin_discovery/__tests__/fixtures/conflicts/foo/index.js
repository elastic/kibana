export default function (kibana) {
  return [
    // two plugins exported without ids will both inherit
    // the id of the pack and conflict
    new kibana.Plugin({}),
    new kibana.Plugin({}),
  ];
}
