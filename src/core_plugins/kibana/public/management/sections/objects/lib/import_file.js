export async function importFile(file, FileReader = window.FileReader) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = ({ target: { result } }) => {
      try {
        resolve(JSON.parse(result));
      } catch (e) {
        reject(e);
      }
    };
    fr.readAsText(file);
  });
}
