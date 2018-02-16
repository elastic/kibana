import bar from '@elastic/bar';

export default function (val) {
  return 'test [' + val + '] (' + bar(val) + ')';
}
