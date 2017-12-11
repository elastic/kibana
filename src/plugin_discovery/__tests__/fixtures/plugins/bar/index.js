export default function (kibana) {
  return [
    new kibana.Plugin({
      id: 'bar:one',
    }),
    new kibana.Plugin({
      id: 'bar:two',
    }),
  ];
}
