import requests

logFile = open('/var/log/probe/KibanaStartup.log', 'w')

res = requests.get('http://localhost:9200/_cat/indices')
content = res.content
kibanaIndexNums = []

for indexData in content.split(" "):
   if ".kibana" not in indexData:
      continue
   for term in indexData.split("_"):
      if ".kibana" in term:
         continue
      kibanaIndexNums.append(int(term))

kibanaIndexNums.remove(1)
kibanaIndexNums = sorted(kibanaIndexNums)
print >>logFile, "Removing .kibana_1 index and current daily index .kibana_{} from list to delete.".format(kibanaIndexNums[-1])
kibanaIndexNums = kibanaIndexNums[:-1]
print >>logFile, "Deleting .kibana_* indices for: {}".format(kibanaIndexNums)

for index in kibanaIndexNums:
   url = "http://localhost:9200/.kibana_{}".format(index)
   res = requests.delete(url)
   if res.status_code != 200:
      print >>logFile, "Could not delete {}".format(url)

logFile.close()
