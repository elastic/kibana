import bar from '@elastic/bar'; // eslint-disable-line import/no-unresolved

export default function(val) {
  return 'test [' + val + '] (' + bar(val) + ')';
}
