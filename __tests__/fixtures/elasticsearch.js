export default function Client() {
  this.indices = {
    create: () => Promise.resolve({ acknowledged: true }),
    exists: () => Promise.resolve(false),
    refresh: () => Promise.resolve(),
  };

  this.transport = {};
}
