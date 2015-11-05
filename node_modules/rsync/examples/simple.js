/*
 * A simple example that builds and executes the following command:
 *
 *     rsync -avz --rsh 'ssh' /path/to/source you@server:/destination/path
 *
 * The `execute` method receives an Error object when an error ocurred, the
 * exit code from the executed command and the executed command as a String.
 *
 * The `shell` method is a shorthand for using `set('rsh', 'ssh')`.
 */

var Rsync = require('../rsync');
var cmd;

/*
 * Set up the command using the fluent interface, starting with an
 * empty command wrapper and adding options using methods.
 */
cmd = new Rsync()
    .flags('avz')
    .shell('ssh')
    .source('/path/to/source')
    .destination('you@server:/destination/path');

cmd.execute(function(error, code, cmd) {
    console.log('All done executing', cmd);
});

/*
 * The same command can be set up by using the build method.
 *
 * This method takes an Object containing the configuration for the
 * Rsync command it returns.
 */
cmd = Rsync.build({
    'flags': 'avz',
    'shell': 'ssh',
    'source': '/path/tp/source',
    'destination': 'you@server:/destination/path'
})

cmd.execute(function(error, code, cmd) {
    console.log('All done executing', cmd);
});
