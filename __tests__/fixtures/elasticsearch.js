export default function Client() {
  this.indices = {
    putMapping: () => Promise.resolve({ acknowledged: true }),
    exists: () => Promise.resolve(false),
    refresh: () => Promise.resolve(),
  };

  this.transport = {};
}
