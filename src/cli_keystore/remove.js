export async function remove(keystore, key) {
  keystore.remove(key);
  keystore.save();
}

export function removeCli(program, keystore) {
  program
    .command('remove <key>')
    .description('Remove a setting from the keystore')
    .option('-s, --silent', 'prevent all logging')
    .action(remove.bind(null, keystore));
}
