export function sanitizeName(name) {
  // blacklisted characters
  const blacklist = ['(', ')'];
  const pattern = blacklist.map(v => escapeRegExp(v)).join('|');
  const regex = new RegExp(pattern, 'g');
  return name.replace(regex, '_');
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
