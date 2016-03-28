// Output the architecture of this node build, either 'i386' or
// 'x86_64'
//
// This copes with both node 0.6.x and 0.8.x.

try {
    // node 0.8
    console.log(process.config.variables.target_arch == 'x64' ? 'x86_64' : 'i386')
}
catch (TypeError) {
    // node 0.6
    console.log(process.arch == 'x64' ? 'x86_64' : 'i386')
};
